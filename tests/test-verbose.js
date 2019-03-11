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

  request('http://localhost:' + plainServer.port + '/', options, function (err, res, body, logs) {
    t.equal(err, null)
    t.equal(body, 'plain')
    t.equal(Array.isArray(logs), true)
    t.equal(logs.length, 1)

    // validate there are no unexpected properties
    var propName
    var propNames = []
    for (propName in logs[0]) {
      if (logs[0].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, ['request', 'response'])

    t.end()
  })
})

tape('HTTP: verbose=true', function (t) {
  var options = { verbose: true, time: false } // verbose overrides timing setting

  request('http://localhost:' + plainServer.port + '/', options, function (err, res, body, logs) {
    t.equal(err, null)
    t.equal(body, 'plain')
    t.equal(Array.isArray(logs), true)
    t.equal(logs.length, 1)

    // validate there are no unexpected properties
    var propName
    var propNames = []
    for (propName in logs[0]) {
      if (logs[0].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, [ 'request', 'localAddress', 'remoteAddress', 'response', 'timingStart',
      'timingStartHRTime', 'timings'
    ])

    t.end()
  })
})

tape('HTTP: redirect(HTTPS) + verbose=true', function (t) {
  var options = {
    verbose: true,
    strictSSL: false
  }

  request('http://localhost:' + plainServer.port + '/redir', options, function (err, res, body, logs) {
    t.equal(err, null)
    t.equal(body, 'https')
    t.equal(Array.isArray(logs), true)
    t.equal(logs.length, 2)

    // validate there are no unexpected properties
    var propName
    var propNames = []
    for (propName in logs[0]) {
      if (logs[0].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, [ 'request', 'localAddress', 'remoteAddress', 'response', 'timingStart',
      'timingStartHRTime', 'timings'
    ])

    propNames = []
    for (propName in logs[1]) {
      if (logs[1].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.equal(logs[1].tlsSessionReused, false)
    t.deepEqual(propNames, ['request', 'localAddress', 'remoteAddress', 'tlsCipher', 'ephemeralKeyInfo',
      'tlsProtocol', 'tlsSessionReused', 'authorized', 'authorizationError', 'peerCertificate',
      'response', 'timingStart', 'timingStartHRTime', 'timings'
    ])

    t.end()
  })
})

tape('HTTPS: verbose=true', function (t) {
  var options = {
    verbose: true,
    strictSSL: false,
    time: false // verbose overrides timing setting
  }

  request('https://localhost:' + httpsServer.port + '/', options, function (err, res, body, logs) {
    t.equal(err, null)
    t.equal(body, 'https')
    t.equal(Array.isArray(logs), true)
    t.equal(logs.length, 1)

    // validate there are no unexpected properties
    var propName
    var propNames = []
    for (propName in logs[0]) {
      if (logs[0].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.equal(logs[0].tlsSessionReused, true)
    t.deepEqual(propNames, ['request', 'localAddress', 'remoteAddress', 'tlsCipher', 'ephemeralKeyInfo',
      'tlsProtocol', 'tlsSessionReused', 'authorized', 'authorizationError', 'peerCertificate',
      'response', 'timingStart', 'timingStartHRTime', 'timings'
    ])

    t.end()
  })
})

tape('HTTPS: redirect(HTTP) + verbose=true', function (t) {
  var options = {
    verbose: true,
    strictSSL: false
  }

  request('https://localhost:' + httpsServer.port + '/redir', options, function (err, res, body, logs) {
    t.equal(err, null)
    t.equal(body, 'plain')
    t.equal(Array.isArray(logs), true)
    t.equal(logs.length, 2)

    // validate there are no unexpected properties
    var propName
    var propNames = []
    for (propName in logs[0]) {
      if (logs[0].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.equal(logs[0].tlsSessionReused, true)
    t.deepEqual(propNames, ['request', 'localAddress', 'remoteAddress', 'tlsCipher', 'ephemeralKeyInfo',
      'tlsProtocol', 'tlsSessionReused', 'authorized', 'authorizationError', 'peerCertificate',
      'response', 'timingStart', 'timingStartHRTime', 'timings'
    ])

    propNames = []
    for (propName in logs[1]) {
      if (logs[1].hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, ['request', 'localAddress', 'remoteAddress', 'response', 'timingStart',
      'timingStartHRTime', 'timings'
    ])

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
