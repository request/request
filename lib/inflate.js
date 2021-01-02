'use strict'

var zlib = require('zlib')
var stream = require('stream')
var inherit = require('util').inherits
var Buffer = require('safe-buffer').Buffer
var Inflate

Inflate = function (options) {
  this.options = options
  this._stream = null
  stream.Transform.call(this)
}

inherit(Inflate, stream.Transform)

Inflate.prototype._transform = function (chunk, encoding, callback) {
  var self = this
  if (!self._stream) {
    // If the response stream does not have a valid deflate header, use `InflateRaw`
    if ((Buffer.from(chunk, encoding)[0] & 0x0F) === 0x08) {
      self._stream = zlib.createInflate(self.options)
    } else {
      self._stream = zlib.createInflateRaw(self.options)
    }

    self._stream.on('error', function (error) {
      self.emit('error', error)
    })

    self._stream.on('data', function (chunk) {
      self.push(chunk)
    })

    self._stream.once('end', function () {
      self._ended = true
      self.push(null)
    })
  }

  self._stream.write(chunk, encoding, callback)
}

Inflate.prototype._flush = function (callback) {
  if (this._stream && !this._ended) {
    this._stream.once('end', callback)
    this._stream.end()
  } else {
    callback()
  }
}

/**
 * Creates an intelligent inflate stream, that can handle deflate responses from older servers,
 * which do not send the correct GZip headers in the response. See http://stackoverflow.com/a/37528114
 * for details on why this is needed.
 *
 * @param {Object=} options - Are passed to the underlying `Inflate` or `InflateRaw` constructor.
 *
 * @returns {*}
 */
module.exports.createInflate = function (options) {
  return new Inflate(options)
}
