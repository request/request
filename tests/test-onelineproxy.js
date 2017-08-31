'use strict'

var http = require('http')
var assert = require('assert')
var request = require('../index')
var tape = require('tape')

var server = http.createServer(function (req, resp) {
  resp.statusCode = 200
  if (req.url === '/get') {
    assert.equal(req.method, 'GET')
    resp.write('content')
    resp.end()
    return
  }
  if (req.url === '/put') {
    var x = ''
    assert.equal(req.method, 'PUT')
    req.on('data', function (chunk) {
      x += chunk
    })
    req.on('end', function () {
      assert.equal(x, 'content')
      resp.write('success')
      resp.end()
    })
    return
  }
  if (req.url === '/proxy') {
    assert.equal(req.method, 'PUT')
    req.pipe(request(server.url + '/put')).pipe(resp)
    return
  }
  if (req.url === '/test') {
    request(server.url + '/get').pipe(request.put(server.url + '/proxy')).pipe(resp)
    return
  }
  throw new Error('Unknown url', req.url)
})

tape('setup', function (t) {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('chained one-line proxying', function (t) {
  request(server.url + '/test', function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'success')
    t.end()
  })
})

tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})
