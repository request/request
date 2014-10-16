'use strict'

var request = require('../index')
  , http = require('http')
  , tape = require('tape')

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('')
})

var stderr = []
  , prevStderrLen = 0

process.stderr.write = function(string, encoding, fd) {
  stderr.push(string)
}

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('a simple request should not fail with debugging enabled', function(t) {
  request.debug = true

  request('http://localhost:6767', function(err, res, body) {
    t.ifError(err, 'the request did not fail')
    t.ok(res, 'the request did not fail')

    t.ok(stderr.length, 'stderr has some messages')
    var patterns = [
      /^REQUEST { uri: /,
      /^REQUEST make request http:\/\/localhost:6767\/\n$/,
      /^REQUEST onRequestResponse /,
      /^REQUEST finish init /,
      /^REQUEST response end /,
      /^REQUEST end event /,
      /^REQUEST emitting complete /
    ]
    patterns.forEach(function(pattern) {
      var found = false
      stderr.forEach(function(msg) {
        if (pattern.test(msg)) {
          found = true
        }
      })
      t.ok(found, 'a log message matches ' + pattern)
    })
    prevStderrLen = stderr.length
    t.end()
  })
})

tape('there should be no further lookups on process.env', function(t) {
  process.env.NODE_DEBUG = ''
  stderr = []

  request('http://localhost:6767', function(err, res, body) {
    t.ifError(err, 'the request did not fail')
    t.ok(res, 'the request did not fail')
    t.equal(stderr.length, prevStderrLen, 'env.NODE_DEBUG is not retested')
    t.end()
  })
})

tape('it should be possible to disable debugging at runtime', function(t) {
  request.debug = false
  stderr = []

  request('http://localhost:6767', function(err, res, body) {
    t.ifError(err, 'the request did not fail')
    t.ok(res, 'the request did not fail')
    t.equal(stderr.length, 0, 'debugging can be disabled')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
