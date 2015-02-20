'use strict'

// a test where we validate the siguature of the keys
// otherwise exactly the same as the ssl test

var server = require('./server')
  , request = require('../index')
  , fs = require('fs')
  , path = require('path')
  , tape = require('tape')

var s = server.createSSLServer()
  , caFile = path.resolve(__dirname, 'ssl/ca/ca.crt')
  , ca = fs.readFileSync(caFile)
  , opts = {
    ciphers: 'AES256-SHA',
    key: path.resolve(__dirname, 'ssl/ca/server.key'),
    cert: path.resolve(__dirname, 'ssl/ca/server.crt')
  }
  , sStrict = server.createSSLServer(s.port + 1, opts)

function runAllTests(strict, s) {
  var strictMsg = (strict ? 'strict ' : 'relaxed ')

  tape(strictMsg + 'setup', function(t) {
    s.listen(s.port, function() {
      t.end()
    })
  })

  function runTest(name, test) {
    tape(strictMsg + name, function(t) {
      s.on('/' + name, test.resp)
      test.uri = s.url + '/' + name
      if (strict) {
        test.strictSSL = true
        test.ca = ca
        test.headers = { host: 'testing.request.mikealrogers.com' }
      } else {
        test.rejectUnauthorized = false
      }
      request(test, function(err, resp, body) {
        t.equal(err, null)
        if (test.expectBody) {
          t.deepEqual(test.expectBody, body)
        }
        t.end()
      })
    })
  }

  runTest('testGet', {
      resp : server.createGetResponse('TESTING!')
    , expectBody: 'TESTING!'
  })

  runTest('testGetChunkBreak', {
      resp : server.createChunkResponse(
      [ new Buffer([239])
      , new Buffer([163])
      , new Buffer([191])
      , new Buffer([206])
      , new Buffer([169])
      , new Buffer([226])
      , new Buffer([152])
      , new Buffer([131])
      ])
    , expectBody: '\uf8ff\u03a9\u2603'
  })

  runTest('testGetJSON', {
      resp : server.createGetResponse('{"test":true}', 'application/json')
    , json : true
    , expectBody: {'test':true}
  })

  runTest('testPutString', {
      resp : server.createPostValidator('PUTTINGDATA')
    , method : 'PUT'
    , body : 'PUTTINGDATA'
  })

  runTest('testPutBuffer', {
      resp : server.createPostValidator('PUTTINGDATA')
    , method : 'PUT'
    , body : new Buffer('PUTTINGDATA')
  })

  runTest('testPutJSON', {
      resp : server.createPostValidator(JSON.stringify({foo: 'bar'}))
    , method: 'PUT'
    , json: {foo: 'bar'}
  })

  runTest('testPutMultipart', {
      resp: server.createPostValidator(
        '--__BOUNDARY__\r\n' +
        'content-type: text/html\r\n' +
        '\r\n' +
        '<html><body>Oh hi.</body></html>' +
        '\r\n--__BOUNDARY__\r\n\r\n' +
        'Oh hi.' +
        '\r\n--__BOUNDARY__--'
        )
    , method: 'PUT'
    , multipart:
      [ {'content-type': 'text/html', 'body': '<html><body>Oh hi.</body></html>'}
      , {'body': 'Oh hi.'}
      ]
  })

  tape(strictMsg + 'cleanup', function(t) {
    s.close(function() {
      t.end()
    })
  })
}

runAllTests(false, s)
runAllTests(true, sStrict)
