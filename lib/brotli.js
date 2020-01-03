'use strict'

var Buffer = require('safe-buffer').Buffer
var Transform = require('stream').Transform
var zlib = require('zlib')
var inherits = require('util').inherits
var createBrotliDecompress = zlib.createBrotliDecompress

if (typeof createBrotliDecompress !== 'function') {
  var brotliDecompressBuffer = require('brotli/decompress')

  createBrotliDecompress = function createBrotliDecompress (options) {
    this.options = options
    Transform.call(this)
  }

  inherits(createBrotliDecompress, Transform)

  createBrotliDecompress.prototype._transform = function (chunk, encoding, callback) {
    try {
      callback(null, Buffer.from(brotliDecompressBuffer(chunk), encoding))
    } catch (err) {
      callback(err)
    }
  }
}

/**
 * Exports a function that can be used to decompress a Brotli stream.
 * supports faster and native brotli, if available, else falls back to userland
 * module
 *
 * @function
 *
 * @param {Object} options BrotliDecompress options
 * @returns {stream.Transform} A BrotliDecompress Transform function
 */
module.exports.createBrotliDecompress = createBrotliDecompress
