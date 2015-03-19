'use strict'

var request = require('../index')
  , http = require('http')
  , fs = require('fs')
  , rimraf = require('rimraf')
  , assert = require('assert')
  , tape = require('tape')

var path = [null, 'test', 'path'].join('/')
  , socket = [__dirname, 'tmp-socket'].join('/')
  , expectedBody = 'connected'
  , statusCode = 200

rimraf.sync(socket)

var s = http.createServer(function(req, res) {
  assert.equal(req.url, path, 'requested path is sent to server')
  res.statusCode = statusCode
  res.end(expectedBody)
})

tape('setup', function(t) {
  s.listen(socket, function() {
    t.end()
  })
})

tape('unix socket connection', function(t) {
  request('http://unix:' + socket + ':' + path, function(err, res, body) {
    t.equal(err, null, 'no error in connection')
    t.equal(res.statusCode, statusCode, 'got HTTP 200 OK response')
    t.equal(body, expectedBody, 'expected response body is received')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    fs.unlink(socket, function() {
      t.end()
    })
  })
})
