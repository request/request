'use strict'

var zlib = require('zlib')
  , stream = require('stream')

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
  return stream.Transform({

    /**
     * Override the _transform method of the stream.
     *
     * @param chunk
     * @param encoding
     * @param callback
     */
    transform: function (chunk, encoding, callback) {
      var self = this
      if (!self._inflate) {
        // If the response stream does not have a valid deflate header, use `InflateRaw`
        if ((new Buffer(chunk, encoding)[0] & 0x0F) === 0x08) {
          self._inflate = zlib.createInflate(options)
        } else {
          self._inflate = zlib.createInflateRaw(options)
        }

        self._inflate.on('error', function (error) {
          self.emit('error', error)
        })

        self.once('finish', function () {
          self._inflate.end()
        })
        self._inflate.on('data', function (chunk) {
          self.push(chunk)
        })

        self._inflate.once('end', function () {
          self._ended = true
          self.push(null)
        })
      }

      self._inflate.write(chunk, encoding, callback)
    },

    /**
     * Override the _flush method of the stream.
     *
     * @param callback
     */
    flush: function (callback) {
      if (this._inflate && !this._ended) {
        this._inflate.once('end', callback)
      } else {
        callback()
      }
    }
  })
}
