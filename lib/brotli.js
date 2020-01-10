'use strict'

var Buffer = require('safe-buffer').Buffer
var Transform = require('stream').Transform
var zlib = require('zlib')
var inherits = require('util').inherits
var createBrotliDecompress = zlib.createBrotliDecompress

if (typeof createBrotliDecompress !== 'function') {
  var brotliDecompressBuffer = require('brotli/decompress')

  var BrotliDecompress = function BrotliDecompress (options) {
    this.options = options
    this.chunks = []

    Transform.call(this, options)
  }

  inherits(BrotliDecompress, Transform)

  BrotliDecompress.prototype._transform = function (chunk, encoding, callback) {
    this.chunks.push(chunk)
    return callback()
  }

  BrotliDecompress.prototype._flush = function (callback) {
    var body

    try {
      body = Buffer.from(brotliDecompressBuffer(Buffer.concat(this.chunks)))
    } catch (err) {
      return callback(err)
    }

    this.push(body)
    return callback()
  }

  createBrotliDecompress = function createBrotliDecompress (options) {
    return new BrotliDecompress(options)
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
