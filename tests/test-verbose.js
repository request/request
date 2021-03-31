'use strict'

var tape = require('tape')
var destroyable = require('server-destroy')

var server = require('./server')
var request = require('../index')

var plainServer = server.createServer()
var httpsServer = server.createSSLServer()

destroyable(plainServer)
destroyable(httpsServer)

tape('setup', function (t) {
  plainServer.listen(0, function () {
    plainServer.on('/', function (req, res) {
      res.writeHead(200)
      res.end('plain')
    })
    plainServer.on('/redir', function (req, res) {
      res.writeHead(301, { 'location': 'https://localhost:' + httpsServer.port + '/' })
      res.end()
    })

    httpsServer.listen(0, function () {
      httpsServer.on('/', function (req, res) {
        res.writeHead(200)
        res.end('https')
      })
      httpsServer.on('/redir', function (req, res) {
        res.writeHead(301, { 'location': 'http://localhost:' + plainServer.port + '/' })
        res.end()
      })

      t.end()
    })
  })
})

tape('verbose=false [default]', function (t) {
  var options = {}

  request('http://localhost:' + plainServer.port + '/', options, function (err, res, body, debug) {
    t.equal(err, null)
    t.equal(body, 'plain')
    t.equal(Array.isArray(debug), true)
    t.equal(debug.length, 1)

    t.equal(res.socket.__SESSION_ID, undefined)
    t.equal(res.socket.__SESSION_DATA, undefined)
    t.deepEqual(Object.keys(debug[0]), ['request', 'response'])

    t.end()
  })
})

tape('HTTP: verbose=true', function (t) {
  var options = { verbose: true, time: false } // verbose overrides timing setting

  request('http://localhost:' + plainServer.port + '/', options, function (err, res, body, debug) {
    t.equal(err, null)
    t.equal(body, 'plain')
    t.equal(Array.isArray(debug), true)
    t.equal(debug.length, 1)

    t.equal(typeof res.socket.__SESSION_ID, 'string')
    t.equal(typeof res.socket.__SESSION_DATA, 'object')
    t.deepEqual(Object.keys(debug[0]), ['request', 'session', 'response', 'timingStart', 'timingStartTimer', 'timings'])
    t.deepEqual(Object.keys(debug[0].request), ['method', 'href', 'proxy', 'httpVersion', 'headers'])
    t.deepEqual(Object.keys(debug[0].session), ['id', 'reused', 'data'])
    t.deepEqual(Object.keys(debug[0].session.data), ['addresses'])
    t.equal(debug[0].session.reused, false)
    t.deepEqual(Object.keys(debug[0].response), ['statusCode', 'headers', 'httpVersion'])

    t.end()
  })
})

tape('HTTP: redirect(HTTPS) + verbose=true', function (t) {
  var options = {
    verbose: true,
    strictSSL: false
  }

  request('http://localhost:' + plainServer.port + '/redir', options, function (err, res, body, debug) {
    t.equal(err, null)
    t.equal(body, 'https')
    t.equal(Array.isArray(debug), true)
    t.equal(debug.length, 2)

    t.equal(typeof res.socket.__SESSION_ID, 'string')
    t.equal(typeof res.socket.__SESSION_DATA, 'object')

    t.deepEqual(Object.keys(debug[0]), ['request', 'session', 'response', 'timingStart', 'timingStartTimer', 'timings'])
    t.deepEqual(Object.keys(debug[0].request), ['method', 'href', 'proxy', 'httpVersion', 'headers'])
    t.ok(debug[0].request.headers.Host)
    t.deepEqual(Object.keys(debug[0].session), ['id', 'reused', 'data'])
    t.deepEqual(Object.keys(debug[0].session.data), ['addresses'])
    t.equal(debug[0].session.reused, false)
    t.deepEqual(Object.keys(debug[0].response), ['statusCode', 'headers', 'httpVersion'])

    t.deepEqual(Object.keys(debug[1]), ['request', 'session', 'response', 'timingStart', 'timingStartTimer', 'timings'])
    t.deepEqual(Object.keys(debug[1].request), ['method', 'href', 'proxy', 'httpVersion', 'headers'])
    t.ok(debug[1].request.headers.Host)
    t.ok(debug[1].request.headers.Referer)
    t.deepEqual(Object.keys(debug[1].session), ['id', 'reused', 'data'])
    t.deepEqual(Object.keys(debug[1].session.data), ['addresses', 'tls'])
    t.deepEqual(Object.keys(debug[1].session.data.tls), ['reused', 'authorized', 'authorizationError', 'cipher', 'protocol', 'ephemeralKeyInfo', 'peerCertificate'])
    t.equal(debug[1].session.reused, false)
    t.deepEqual(Object.keys(debug[1].response), ['statusCode', 'headers', 'httpVersion'])

    t.end()
  })
})

tape('HTTPS: verbose=true', function (t) {
  var options = {
    verbose: true,
    strictSSL: false,
    time: false // verbose overrides timing setting
  }

  request('https://localhost:' + httpsServer.port + '/', options, function (err, res, body, debug) {
    t.equal(err, null)
    t.equal(body, 'https')
    t.equal(Array.isArray(debug), true)
    t.equal(debug.length, 1)

    t.equal(typeof res.socket.__SESSION_ID, 'string')
    t.equal(typeof res.socket.__SESSION_DATA, 'object')
    t.deepEqual(Object.keys(debug[0]), ['request', 'session', 'response', 'timingStart', 'timingStartTimer', 'timings'])
    t.deepEqual(Object.keys(debug[0].request), ['method', 'href', 'proxy', 'httpVersion', 'headers'])
    t.deepEqual(Object.keys(debug[0].session), ['id', 'reused', 'data'])
    t.deepEqual(Object.keys(debug[0].session.data), ['addresses', 'tls'])
    t.deepEqual(Object.keys(debug[0].session.data.tls), ['reused', 'authorized', 'authorizationError', 'cipher', 'protocol', 'ephemeralKeyInfo', 'peerCertificate'])
    t.equal(debug[0].session.reused, false)
    t.deepEqual(Object.keys(debug[0].response), ['statusCode', 'headers', 'httpVersion'])

    t.end()
  })
})

tape('HTTPS: redirect(HTTP) + verbose=true', function (t) {
  var options = {
    verbose: true,
    strictSSL: false
  }

  request('https://localhost:' + httpsServer.port + '/redir', options, function (err, res, body, debug) {
    t.equal(err, null)
    t.equal(body, 'plain')
    t.equal(Array.isArray(debug), true)
    t.equal(debug.length, 2)

    t.equal(typeof res.socket.__SESSION_ID, 'string')
    t.equal(typeof res.socket.__SESSION_DATA, 'object')

    t.deepEqual(Object.keys(debug[0]), ['request', 'session', 'response', 'timingStart', 'timingStartTimer', 'timings'])
    t.deepEqual(Object.keys(debug[0].request), ['method', 'href', 'proxy', 'httpVersion', 'headers'])
    t.deepEqual(Object.keys(debug[0].session), ['id', 'reused', 'data'])
    t.deepEqual(Object.keys(debug[0].session.data), ['addresses', 'tls'])
    t.deepEqual(Object.keys(debug[0].session.data.tls), ['reused', 'authorized', 'authorizationError', 'cipher', 'protocol', 'ephemeralKeyInfo', 'peerCertificate'])
    t.equal(debug[0].session.reused, false)
    t.deepEqual(Object.keys(debug[0].response), ['statusCode', 'headers', 'httpVersion'])

    t.deepEqual(Object.keys(debug[1]), ['request', 'session', 'response', 'timingStart', 'timingStartTimer', 'timings'])
    t.deepEqual(Object.keys(debug[1].request), ['method', 'href', 'proxy', 'httpVersion', 'headers'])
    t.deepEqual(Object.keys(debug[1].session), ['id', 'reused', 'data'])
    t.deepEqual(Object.keys(debug[1].session.data), ['addresses'])
    t.equal(debug[1].session.reused, false)
    t.deepEqual(Object.keys(debug[1].response), ['statusCode', 'headers', 'httpVersion'])

    t.end()
  })
})

tape('cleanup', function (t) {
  plainServer.destroy(function () {
    httpsServer.destroy(function () {
      t.end()
    })
  })
})
