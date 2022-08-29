'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')
const url = require('url')

const s = http.createServer(function (req, res) {
  if (req.url === '/redirect/') {
    res.writeHead(302, {
      location: '/'
    })
  } else {
    res.statusCode = 200
    res.setHeader('X-PATH', req.url)
  }
  res.end('ok')
})

function addTest (baseUrl, uri, expected) {
  tape('test baseurl="' + baseUrl + '" uri="' + uri + '"', function (t) {
    request(uri, { baseUrl: baseUrl }, function (err, resp, body) {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.equal(resp.headers['x-path'], expected)
      t.end()
    })
  })
}

function addTests () {
  addTest(s.url, '', '/')
  addTest(s.url + '/', '', '/')
  addTest(s.url, '/', '/')
  addTest(s.url + '/', '/', '/')
  addTest(s.url + '/api', '', '/api')
  addTest(s.url + '/api/', '', '/api/')
  addTest(s.url + '/api', '/', '/api/')
  addTest(s.url + '/api/', '/', '/api/')
  addTest(s.url + '/api', 'resource', '/api/resource')
  addTest(s.url + '/api/', 'resource', '/api/resource')
  addTest(s.url + '/api', '/resource', '/api/resource')
  addTest(s.url + '/api/', '/resource', '/api/resource')
  addTest(s.url + '/api', 'resource/', '/api/resource/')
  addTest(s.url + '/api/', 'resource/', '/api/resource/')
  addTest(s.url + '/api', '/resource/', '/api/resource/')
  addTest(s.url + '/api/', '/resource/', '/api/resource/')
}

tape('setup', function (t) {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    addTests()
    tape('cleanup', function (t) {
      s.close(function () {
        t.end()
      })
    })
    t.end()
  })
})

tape('baseUrl', function (t) {
  request('resource', {
    baseUrl: s.url
  }, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('baseUrl defaults', function (t) {
  const withDefaults = request.defaults({
    baseUrl: s.url
  })
  withDefaults('resource', function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('baseUrl and redirects', function (t) {
  request('/', {
    baseUrl: s.url + '/redirect'
  }, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(resp.headers['x-path'], '/')
    t.end()
  })
})

tape('error when baseUrl is not a String', function (t) {
  request('resource', {
    baseUrl: new url.URL(s.url + '/path')
  }, function (err, resp, body) {
    t.notEqual(err, null)
    t.equal(err.message, 'options.baseUrl must be a string')
    t.end()
  })
})

tape('error when uri is not a String', function (t) {
  request(new url.URL('resource'), {
    baseUrl: s.url + '/path'
  }, function (err, resp, body) {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri must be a string when using options.baseUrl')
    t.end()
  })
})

tape('error on baseUrl and uri with scheme', function (t) {
  request(s.url + '/path/ignoring/baseUrl', {
    baseUrl: s.url + '/path/'
  }, function (err, resp, body) {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri must be a path when using options.baseUrl')
    t.end()
  })
})

tape('error on baseUrl and uri with scheme-relative url', function (t) {
  request(s.url.slice('http:'.length) + '/path/ignoring/baseUrl', {
    baseUrl: s.url + '/path/'
  }, function (err, resp, body) {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri must be a path when using options.baseUrl')
    t.end()
  })
})
