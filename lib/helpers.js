'use strict'

const jsonSafeStringify = require('json-stringify-safe')
const { createHash } = require('crypto')
const { Buffer } = require('safe-buffer')

const defer =
  typeof setImmediate === 'undefined' ? process.nextTick : setImmediate

function paramsHaveRequestBody (params) {
  return (
    params.body ||
    params.requestBodyStream ||
    (params.json && typeof params.json !== 'boolean') ||
    params.multipart
  )
}

function safeStringify (obj, replacer) {
  let ret
  try {
    ret = JSON.stringify(obj, replacer)
  } catch (e) {
    ret = jsonSafeStringify(obj, replacer)
  }
  return ret
}

function md5 (str) {
  return createHash('md5')
    .update(str)
    .digest('hex')
}

function isReadStream (rs) {
  return rs.readable && rs.path && rs.mode
}

function toBase64 (str) {
  return Buffer.from(str || '', 'utf8').toString('base64')
}

function copy (obj) {
  const o = {}
  Object.keys(obj).forEach(i => {
    o[i] = obj[i]
  })
  return o
}

function version () {
  const numbers = process.version.replace('v', '').split('.')
  return {
    major: parseInt(numbers[0], 10),
    minor: parseInt(numbers[1], 10),
    patch: parseInt(numbers[2], 10)
  }
}

module.exports = {
  paramsHaveRequestBody,
  safeStringify,
  md5,
  isReadStream,
  toBase64,
  copy,
  version,
  defer
}
