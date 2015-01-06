'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('ok')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('lowercase', function(t) {
  request('http://localhost:6767', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('uppercase', function(t) {
  request('HTTP://localhost:6767', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('mixedcase', function(t) {
  request('HtTp://localhost:6767', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port', function(t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: 6767
    }
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port 1', function(t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: 6767
    }
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port 2', function(t) {
  request({
    protocol: 'http:',
    hostname: 'localhost',
    port: 6767
  }, {
    // need this empty options object, otherwise request thinks no uri was set
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port 3', function(t) {
  request({
    protocol: 'http:',
    hostname: 'localhost',
    port: 6767
  }, function(err, res, body) {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri is a required argument')
    t.equal(body, undefined)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
