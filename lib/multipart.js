'use strict'

const uuid = require('uuid/v4')
const CombinedStream = require('combined-stream')
const isstream = require('isstream')
const { Buffer } = require('safe-buffer')

class Multipart {
  constructor (request) {
    this.request = request
    this.boundary = uuid()
    this.chunked = false
    this.body = null
  }

  isChunked (options) {
    let { chunked } = options
    const parts = options.data || options

    if (!parts.forEach) {
      this.request.emit(
        'error',
        new Error('Argument error, options.multipart.')
      )
    }

    if (options.chunked === undefined) {
      chunked = false
    }

    if (this.request.getHeader('transfer-encoding') === 'chunked') {
      chunked = true
    }

    if (!chunked) {
      parts.forEach(part => {
        if (typeof part.body === 'undefined') {
          this.request.emit(
            'error',
            new Error('Body attribute missing in multipart.')
          )
        }
        if (isstream(part.body)) {
          chunked = true
        }
      })
    }

    return chunked
  }

  setHeaders (chunked) {
    if (chunked && !this.request.hasHeader('transfer-encoding')) {
      this.request.setHeader('transfer-encoding', 'chunked')
    }

    const header = this.request.getHeader('content-type')

    if (!header || header.indexOf('multipart') === -1) {
      this.request.setHeader(
        'content-type',
        'multipart/related; boundary=' + this.boundary
      )
    } else {
      if (header.indexOf('boundary') !== -1) {
        this.boundary = header.replace(/.*boundary=([^\s;]+).*/, '$1')
      } else {
        this.request.setHeader(
          'content-type',
          header + '; boundary=' + this.boundary
        )
      }
    }
  }

  build (parts, chunked) {
    const body = chunked ? new CombinedStream() : []

    function add (part) {
      if (typeof part === 'number') {
        part = part.toString()
      }
      return chunked ? body.append(part) : body.push(Buffer.from(part))
    }

    if (this.request.preambleCRLF) {
      add('\r\n')
    }

    parts.forEach(part => {
      let preamble = '--' + this.boundary + '\r\n'
      Object.keys(part).forEach(key => {
        if (key === 'body') {
          return
        }
        preamble += key + ': ' + part[key] + '\r\n'
      })
      preamble += '\r\n'
      add(preamble)
      add(part.body)
      add('\r\n')
    })
    add('--' + this.boundary + '--')

    if (this.request.postambleCRLF) {
      add('\r\n')
    }

    return body
  }

  onRequest (options) {
    const chunked = this.isChunked(options)
    const parts = options.data || options

    this.setHeaders(chunked)
    this.chunked = chunked
    this.body = this.build(parts, chunked)
  }
}

module.exports = { Multipart }
