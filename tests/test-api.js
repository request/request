'use strict'

var tls = require('tls')
var http = require('http')

var tape = require('tape')

var request = require('../index')

var server
var origCreateSecureContext = tls.createSecureContext // fixture

tape('setup', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    res.writeHead(202)
    req.pipe(res)
  })
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('callback option', function (t) {
  request({
    url: server.url,
    callback: function (err, res, body) {
      t.error(err)
      t.equal(res.statusCode, 202)
      t.end()
    }
  })
})

tape('enableNodeExtraCACerts', function (t) {
  request.enableNodeExtraCACerts(function (err) {
    t.error(err)
    t.equal(typeof tls.createSecureContext, 'function')
    t.equal(typeof tls.__createSecureContext, 'function')
    t.equal(tls.__createSecureContext, origCreateSecureContext) // backup
    request.disableNodeExtraCACerts() // RESET
    t.end()
  })
})

tape('enableNodeExtraCACerts: without callback', function (t) {
  request.enableNodeExtraCACerts()

  t.equal(typeof tls.createSecureContext, 'function')
  t.equal(typeof tls.__createSecureContext, 'function')
  t.equal(tls.__createSecureContext, origCreateSecureContext) // backup
  request.disableNodeExtraCACerts() // RESET
  t.end()
})

tape('enableNodeExtraCACerts: with missing addCACert', function (t) {
  // override createSecureContext
  tls.createSecureContext = function () {
    return {
      context: {
        addCACert: undefined
      }
    }
  }

  request.enableNodeExtraCACerts(function (err) {
    t.ok(err)
    t.equal(err.message, 'SecureContext.addCACert is not a function')
    t.equal(typeof tls.__createSecureContext, 'undefined')
    tls.createSecureContext = origCreateSecureContext // RESET
    t.end()
  })
})

tape('enableNodeExtraCACerts: on createSecureContext error', function (t) {
  // override createSecureContext
  tls.createSecureContext = function () {
    throw 'something went wrong'
  }

  request.enableNodeExtraCACerts(function (err) {
    t.ok(err)
    t.equal(err, 'something went wrong')
    t.equal(typeof tls.__createSecureContext, 'undefined')
    tls.createSecureContext = origCreateSecureContext // RESET
    t.end()
  })
})

tape('enableNodeExtraCACerts: called twice', function (t) {
  request.enableNodeExtraCACerts(function (err) {
    t.error(err)
    t.equal(typeof tls.createSecureContext, 'function')
    t.equal(typeof tls.__createSecureContext, 'function')
    t.equal(tls.__createSecureContext, origCreateSecureContext)

    // called twice
    request.enableNodeExtraCACerts(function (err) {
      t.error(err)
      t.equal(typeof tls.createSecureContext, 'function')
      t.equal(typeof tls.__createSecureContext, 'function')
      t.equal(tls.__createSecureContext, origCreateSecureContext)
      request.disableNodeExtraCACerts() // RESET
      t.end()
    })
  })
})

tape('disableNodeExtraCACerts', function (t) {
  // enable first
  request.enableNodeExtraCACerts(function (err) {
    t.error(err)

    // disable
    request.disableNodeExtraCACerts()

    t.equal(typeof tls.createSecureContext, 'function')
    t.equal(typeof tls.__createSecureContext, 'undefined')
    t.equal(tls.createSecureContext, origCreateSecureContext) // restored
    t.end()
  })
})

tape('disableNodeExtraCACerts: called twice', function (t) {
  // enable first
  request.enableNodeExtraCACerts(function (err) {
    t.error(err)

    // disable
    request.disableNodeExtraCACerts()
    request.disableNodeExtraCACerts()

    t.equal(typeof tls.createSecureContext, 'function')
    t.equal(typeof tls.__createSecureContext, 'undefined')
    t.equal(tls.createSecureContext, origCreateSecureContext) // restored
    t.end()
  })
})

tape('cleanup', function (t) {
  server.close(t.end)
})
