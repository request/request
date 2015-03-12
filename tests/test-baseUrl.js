'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')
  , url = require('url')

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.setHeader('X-PATH', req.url)
  res.end('ok')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('baseUrl', function(t) {
  request('resource', {
    baseUrl: 'http://localhost:6767'
  }, function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('baseUrl defaults', function(t) {
  var withDefaults = request.defaults({
    baseUrl: 'http://localhost:6767'
  })
  withDefaults('resource', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

function addTest(baseUrl, uri, expected) {
  tape('test baseurl="' + baseUrl + '" uri="' + uri + '"', function(t) {
    request(uri, { baseUrl: baseUrl }, function(err, resp, body) {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.equal(resp.headers['x-path'], expected)
      t.end()
    })
  })
}

addTest('http://localhost:6767', '', '/')
addTest('http://localhost:6767/', '', '/')
addTest('http://localhost:6767', '/', '/')
addTest('http://localhost:6767/', '/', '/')
addTest('http://localhost:6767/api', '', '/api')
addTest('http://localhost:6767/api/', '', '/api/')
addTest('http://localhost:6767/api', '/', '/api/')
addTest('http://localhost:6767/api/', '/', '/api/')
addTest('http://localhost:6767/api', 'resource', '/api/resource')
addTest('http://localhost:6767/api/', 'resource', '/api/resource')
addTest('http://localhost:6767/api', '/resource', '/api/resource')
addTest('http://localhost:6767/api/', '/resource', '/api/resource')
addTest('http://localhost:6767/api', 'resource/', '/api/resource/')
addTest('http://localhost:6767/api/', 'resource/', '/api/resource/')
addTest('http://localhost:6767/api', '/resource/', '/api/resource/')
addTest('http://localhost:6767/api/', '/resource/', '/api/resource/')

tape('error on parsed URL baseUrl', function(t) {
  request('resource', {
    baseUrl: url.parse('http://localhost:6767/path')
  }, function(err, resp, body) {
    t.notEqual(err, null)
    t.end()
  })
})

tape('error on baseUrl and parsed URL uri', function(t) {
  request(url.parse('resource'), {
    baseUrl: 'http://localhost:6767/path'
  }, function(err, resp, body) {
    t.notEqual(err, null)
    t.end()
  })
})

tape('error on baseUrl and absolute path uri', function(t) {
  request('/end/point', {
    baseUrl: 'http://localhost:6767/path/'
  }, function(err, resp, body) {
    t.notEqual(err, null)
    t.end()
  })
})

tape('error on baseUrl and uri with scheme', function(t) {
  request('http://localhost:6767/path/ignoring/baseUrl', {
    baseUrl: 'http://localhost:6767/path/'
  }, function(err, resp, body) {
    t.notEqual(err, null)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
