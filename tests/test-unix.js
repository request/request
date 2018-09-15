'use strict'

var request = require('../index')
var http = require('http')
var fs = require('fs')
var rimraf = require('rimraf')
var assert = require('assert')
var tape = require('tape')
var url = require('url')

var rawPath = [null, 'raw', 'path'].join('/')
var queryPath = [null, 'query', 'path'].join('/')
var searchString = '?foo=bar'
var socket = [__dirname, 'tmp-socket'].join('/')
var expectedBody = 'connected'
var statusCode = 200

rimraf.sync(socket)

var s = http.createServer(function (req, res) {
  var incomingUrl = url.parse(req.url)
  switch (incomingUrl.pathname) {
    case rawPath:
      assert.equal(incomingUrl.pathname, rawPath, 'requested path is sent to server')
      break

    case queryPath:
      assert.equal(incomingUrl.pathname, queryPath, 'requested path is sent to server')
      assert.equal(incomingUrl.search, searchString, 'query string is sent to server')
      break

    default:
      assert(false, 'A valid path was requested')
  }
  res.statusCode = statusCode
  res.end(expectedBody)
})

tape('setup', function (t) {
  s.listen(socket, function () {
    t.end()
  })
})

tape('unix socket connection', function (t) {
  request('http://unix:' + socket + ':' + rawPath, function (err, res, body) {
    t.equal(err, null, 'no error in connection')
    t.equal(res.statusCode, statusCode, 'got HTTP 200 OK response')
    t.equal(body, expectedBody, 'expected response body is received')
    t.end()
  })
})

tape('unix socket connection with qs', function (t) {
  request({
    uri: 'http://unix:' + socket + ':' + queryPath,
    qs: {
      foo: 'bar'
    }
  }, function (err, res, body) {
    t.equal(err, null, 'no error in connection')
    t.equal(res.statusCode, statusCode, 'got HTTP 200 OK response')
    t.equal(body, expectedBody, 'expected response body is received')
    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    fs.unlink(socket, function () {
      t.end()
    })
  })
})
