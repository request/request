'use strict'

// a test to verify if request works with SNI with different domains

var server = require('./server')
  , request = require('../index')
  , fs = require('fs')
  , path = require('path')
  , tape = require('tape')
  , tls = require('tls')

var caFile = path.resolve(__dirname, 'ssl/ca/ca.crt')
  , ca = fs.readFileSync(caFile)

function getSecureContext (keyPath, crtPath) {
  return tls.createSecureContext({
    key:  fs.readFileSync(path.resolve(__dirname, keyPath)),
    cert: fs.readFileSync(path.resolve(__dirname, crtPath)),
    ca: [ca]
  })
}

var secureContext = {
  'localhost': getSecureContext('ssl/ca/localhost.key', 'ssl/ca/localhost.crt'),
  'testing.request.mikealrogers.com': getSecureContext('ssl/ca/server.key', 'ssl/ca/server.crt')
}

var opts = {
    ciphers: 'AES256-SHA',
    key: path.resolve(__dirname, 'ssl/ca/server.key'),
    cert: path.resolve(__dirname, 'ssl/ca/server.crt'),
    SNICallback: function (domain, cb) {
      cb(null, secureContext[domain])
    }
  }
  , s = server.createSSLServer(null, opts)
  , sStrict = server.createSSLServer(s.port + 1, opts)

function runAllTests(strict, s) {
  var strictMsg = (strict ? 'strict ' : 'relaxed ')

  tape(strictMsg + 'setup', function(t) {
    s.listen(s.port, function() {
      t.end()
    })
  })

  function applyTestOptions(name, test) {
    s.on('/' + name, test.resp)
    test.uri = s.url + '/' + name
    if (strict) {
      test.strictSSL = true
      test.ca = ca
    }
    else {
      test.rejectUnauthorized = false
    }
  }

  function runTest(name, test) {
    tape(strictMsg + name, function(t) {
      applyTestOptions(name, test)
      request(test, function(err, resp, body) {
        t.equal(err, null)
        test.expectBody && t.deepEqual(test.expectBody, body)
        t.end()
      })
    })
  }

  function runStrictOnlyErrorTest(name, test) {
    tape(strictMsg + name, function(t) {
      applyTestOptions(name, test)
      request(test, function(err, resp, body) {
        if (strict) {
          t.notEqual(err, null)
          test.expectErrorToContain && t.ok(err.message.indexOf(test.expectErrorToContain) > -1)
        }
        t.end()
      })
    })
  }

  runTest('testSNI', {
    resp : server.createGetResponse('TESTING!')
    , expectBody: 'TESTING!',
    agentOptions: {servername: 'testing.request.mikealrogers.com'}
  })

  runTest('testSNILocalhost', {
    resp : server.createGetResponse('TESTING!')
    , expectBody: 'TESTING!'
    , agentOptions: {servername: 'localhost'}
  })

  runStrictOnlyErrorTest('testSNINonexistentDomainCertificate', {
    resp : server.createGetResponse('TESTING!')
    , expectErrorToContain: 'Hostname/IP doesn\'t match certificate\'s altnames'
    , agentOptions: {servername: 'nonexistent.com'}
  })

  tape(strictMsg + 'cleanup', function(t) {
    s.close(function() {
      sStrict.close(function() {
        t.end()
      })
    })
  })
}

runAllTests(false, s)

if (!process.env.running_under_istanbul) {
  // somehow this test modifies the process state
  // test coverage runs all tests in a single process via tape
  // executing this test causes one of the tests in test-tunnel.js to throw
  runAllTests(true, sStrict)
}
