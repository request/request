'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')

var s = http.createServer(function (req, res) {
  res.statusCode = 200
  res.end('ok')
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.port = this.address().port
    s.url = 'http://localhost:' + s.port
    t.end()
  })
})

tape('lowercase', function (t) {
  request(s.url, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('uppercase', function (t) {
  request(s.url.replace('http', 'HTTP'), function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('mixedcase', function (t) {
  request(s.url.replace('http', 'HtTp'), function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port', function (t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: s.port
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port 1', function (t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: s.port
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port 2', function (t) {
  request({
    protocol: 'http:',
    hostname: 'localhost',
    port: s.port
  }, {
    // need this empty options object, otherwise request thinks no uri was set
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port 3', function (t) {
  request({
    protocol: 'http:',
    hostname: 'localhost',
    port: s.port
  }, function (err, res, body) {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri is a required argument')
    t.equal(body, undefined)
    t.end()
  })
})

tape('hostname and query string', function (t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: s.port
    },
    qs: {
      test: 'test'
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
