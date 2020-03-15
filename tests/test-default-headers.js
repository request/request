'use strict'

var METHODS = require('http').METHODS
var tape = require('tape')
var destroyable = require('server-destroy')

var request = require('../index')
var httpServer = require('./server').createServer()

destroyable(httpServer)

function forEachAsync (items, fn, cb) {
  !cb && (cb = function () { /* (ಠ_ಠ) */ })

  if (!(Array.isArray(items) && fn)) { return cb() }

  var index = 0
  var totalItems = items.length
  function next (err) {
    if (err || index >= totalItems) {
      return cb(err)
    }

    try {
      fn.call(items, items[index++], next)
    } catch (error) {
      return cb(error)
    }
  }

  if (!totalItems) { return cb() }

  next()
}

tape('setup', function (t) {
  httpServer.listen(0, t.end)
})

tape('default headers', function (t) {
  var url = httpServer.url
  // @note Node.js <= v10 force adds content-length
  var traceHeaders = parseInt(process.version.slice(1)) <= 10
    ? 'host | connection | content-length' : 'host | connection'

  httpServer.on('request', function (req, res) {
    var headers = Object.keys(req.headers).join(' | ')
    switch (req.method) {
      case 'GET':
      case 'HEAD':
      case 'DELETE':
      case 'OPTIONS':
        t.equal(headers, 'host | connection')
        break
      case 'TRACE':
        t.equal(headers, traceHeaders)
        break
      default:
        t.equal(headers, 'host | content-length | connection')
        break
    }
    res.end()
  })

  forEachAsync(METHODS, function (method, next) {
    if (method === 'CONNECT') { return next() }
    request({ url, method }, next)
  }, t.end)
})

tape('cleanup', function (t) {
  httpServer.destroy(t.end)
})
