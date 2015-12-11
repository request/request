'use strict'

var jsonSafeStringify = require('json-stringify-safe')
  , isReadable = require('isstream').isReadable
  , crypto = require('crypto')
  , http = require('http')

function deferMethod() {
  if (typeof setImmediate === 'undefined') {
    return process.nextTick
  }

  return setImmediate
}

function isFunction(value) {
  return typeof value === 'function'
}

function paramsHaveRequestBody(params) {
  return (
    params.body ||
    params.requestBodyStream ||
    (params.json && typeof params.json !== 'boolean') ||
    params.multipart
  )
}

function safeStringify (obj) {
  var ret
  try {
    ret = JSON.stringify(obj)
  } catch (e) {
    ret = jsonSafeStringify(obj)
  }
  return ret
}

function md5 (str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

function isReadStream (obj) {
  return isReadable(obj) && !(obj instanceof http.IncomingMessage)
}

function toBase64 (str) {
  return (new Buffer(str || '', 'utf8')).toString('base64')
}

function copy (obj) {
  var o = {}
  Object.keys(obj).forEach(function (i) {
    o[i] = obj[i]
  })
  return o
}

function version () {
  var numbers = process.version.replace('v', '').split('.')
  return {
    major: parseInt(numbers[0], 10),
    minor: parseInt(numbers[1], 10),
    patch: parseInt(numbers[2], 10)
  }
}

exports.isFunction            = isFunction
exports.paramsHaveRequestBody = paramsHaveRequestBody
exports.safeStringify         = safeStringify
exports.md5                   = md5
exports.isReadStream          = isReadStream
exports.toBase64              = toBase64
exports.copy                  = copy
exports.version               = version
exports.defer                 = deferMethod()
