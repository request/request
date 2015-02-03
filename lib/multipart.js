'use strict'

var uuid = require('node-uuid')
  , CombinedStream = require('combined-stream')
  , isstream = require('isstream')


function Multipart () {
  this.boundary = uuid()
  this.chunked = false
  this.body = null
}

Multipart.prototype.isChunked = function (request, options) {
  var chunked = false
    , parts = options.data || options

  if (!parts.forEach) {
    throw new Error('Argument error, options.multipart.')
  }

  if (request.getHeader('transfer-encoding') === 'chunked') {
    chunked = true
  }

  if (options.chunked !== undefined) {
    chunked = options.chunked
  }

  if (!chunked) {
    parts.forEach(function (part) {
      if(typeof part.body === 'undefined') {
        throw new Error('Body attribute missing in multipart.')
      }
      if (isstream(part.body)) {
        chunked = true
      }
    })
  }

  return chunked
}

Multipart.prototype.setHeaders = function (request, chunked) {
  var self = this

  if (chunked && !request.hasHeader('transfer-encoding')) {
    request.setHeader('transfer-encoding', 'chunked')
  }

  var header = request.getHeader('content-type')
  var contentType = (!header || header.indexOf('multipart') === -1)
    ? 'multipart/related'
    : header.split(';')[0]

  request.setHeader('content-type', contentType + '; boundary=' + self.boundary)
}

Multipart.prototype.build = function (request, parts, chunked) {
  var self = this
  var body = chunked ? new CombinedStream() : []

  function add (part) {
    return chunked ? body.append(part) : body.push(new Buffer(part))
  }

  if (request.preambleCRLF) {
    add('\r\n')
  }

  parts.forEach(function (part) {
    var preamble = '--' + self.boundary + '\r\n'
    Object.keys(part).forEach(function (key) {
      if (key === 'body') { return }
      preamble += key + ': ' + part[key] + '\r\n'
    })
    preamble += '\r\n'
    add(preamble)
    add(part.body)
    add('\r\n')
  })
  add('--' + self.boundary + '--')

  if (request.postambleCRLF) {
    add('\r\n')
  }

  return body
}

Multipart.prototype.related = function (request, options) {
  var self = this

  var chunked = self.isChunked(request, options)
  self.setHeaders(request, chunked)

  var parts = options.data || options
  var body = self.build(request, parts, chunked)

  self.chunked = chunked
  self.body = body
}

exports.Multipart = Multipart
