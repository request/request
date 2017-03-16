'use strict'

const jsonSafeStringify = require('json-stringify-safe')
const crypto = require('crypto')
const Buffer = require('safe-buffer').Buffer

const defer = typeof setImmediate === 'undefined'
  ? process.nextTick
  : setImmediate

const paramsHaveRequestBody = params => {
  return (
    params.body ||
    params.requestBodyStream ||
    (params.json && typeof params.json !== 'boolean') ||
    params.multipart
  )
}

const safeStringify = (obj, replacer) => {
  var ret
  try {
    ret = JSON.stringify(obj, replacer)
  } catch (e) {
    ret = jsonSafeStringify(obj, replacer)
  }
  return ret
}

const md5 = str => crypto.createHash('md5').update(str).digest('hex')

const isReadStream = rs => rs.readable && rs.path && rs.mode

const toBase64 = str => Buffer.from(str || '', 'utf8').toString('base64')

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

exports.paramsHaveRequestBody = paramsHaveRequestBody
exports.safeStringify = safeStringify
exports.md5 = md5
exports.isReadStream = isReadStream
exports.toBase64 = toBase64
exports.copy = copy
exports.version = version
exports.defer = defer
