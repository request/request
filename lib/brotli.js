'use strict'

var stream = require('stream')
var inherit = require('util').inherits
var brotliDecompressBuffer = require('brotli/decompress')
var BrotliDecompress

BrotliDecompress = function (options) {
  this.options = options
  stream.Transform.call(this)
}

inherit(BrotliDecompress, stream.Transform)

BrotliDecompress.prototype._transform = function (chunk, encoding, callback) {
  try {
    // callback(null, Buffer.from(chunk), encoding);
    callback(null, Buffer.from(brotliDecompressBuffer(chunk), encoding))
  } catch (err) {
    callback(err)
  }
}

/**
 * Creates a BrotliDecompress stream
 *
 * @param {Object=} options
 *
 * @returns {*}
 */
module.exports.createBrotliDecompress = function (options) {
  return new BrotliDecompress(options)
}
