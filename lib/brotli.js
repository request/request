'use strict'

var Transform = require('stream').Transform
var brotliDecompressBuffer = require('brotli/decompress')
var zlib = require('zlib')
var createBrotliDecompress

createBrotliDecompress = new Transform({
  transform (chunk, encoding, callback) {
    try {
      callback(null, Buffer.from(brotliDecompressBuffer(chunk), encoding))
    } catch (err) {
      callback(err)
    }
  }
})

/**
 * Creates a BrotliDecompress stream
 * supports faster and native brotli, if available, else fallback to userland module
 *
 * @param {Object=} options
 *
 * @returns {*}
 */
module.exports.createBrotliDecompress = typeof zlib.createBrotliDecompress === 'function'
  ? zlib.createBrotliDecompress
  : createBrotliDecompress
