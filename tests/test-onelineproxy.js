'use strict'

var http = require('http')
  , assert = require('assert')
  , request = require('../index')
  , tape = require('tape')

var server = http.createServer(function(req, resp) {
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
    req.on('data', function(chunk) {
      x += chunk
    })
    req.on('end', function() {
      assert.equal(x, 'content')
      resp.write('success')
      resp.end()
    })
    return
  }
  if (req.url === '/proxy') {
    assert.equal(req.method, 'PUT')
    req.pipe(request('http://localhost:6767/put')).pipe(resp)
    return
  }
  if (req.url === '/test') {
    request('http://localhost:6767/get').pipe(request.put('http://localhost:6767/proxy')).pipe(resp)
    return
  }
  throw new Error('Unknown url', req.url)
})

tape('setup', function(t) {
  server.listen(6767, function() {
    t.end()
  })
})

tape('chained one-line proxying', function(t) {
  request('http://localhost:6767/test', function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'success')
    t.end()
  })
})

tape('cleanup', function(t) {
  server.close(function() {
    t.end()
  })
})
