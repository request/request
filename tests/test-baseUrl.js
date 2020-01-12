'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')
const url = require('url')

const s = http.createServer((req, res) => {
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
  tape('test baseurl="' + baseUrl + '" uri="' + uri + '"', (t) => {
    request(uri, { baseUrl: baseUrl }, (err, resp, body) => {
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

tape('setup', (t) => {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    addTests()
    tape('cleanup', (t) => {
      s.close(() => {
        t.end()
      })
    })
    t.end()
  })
})

tape('baseUrl', (t) => {
  request('resource', {
    baseUrl: s.url
  }, (err, resp, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('baseUrl defaults', (t) => {
  const withDefaults = request.defaults({
    baseUrl: s.url
  })
  withDefaults('resource', (err, resp, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('baseUrl and redirects', (t) => {
  request('/', {
    baseUrl: s.url + '/redirect'
  }, (err, resp, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(resp.headers['x-path'], '/')
    t.end()
  })
})

tape('error when baseUrl is not a String', (t) => {
  request('resource', {
    baseUrl: url.parse(s.url + '/path')
  }, (err, resp, body) => {
    t.notEqual(err, null)
    t.equal(err.message, 'options.baseUrl must be a string')
    t.end()
  })
})

tape('error when uri is not a String', (t) => {
  request(url.parse('resource'), {
    baseUrl: s.url + '/path'
  }, (err, resp, body) => {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri must be a string when using options.baseUrl')
    t.end()
  })
})

tape('error on baseUrl and uri with scheme', (t) => {
  request(s.url + '/path/ignoring/baseUrl', {
    baseUrl: s.url + '/path/'
  }, (err, resp, body) => {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri must be a path when using options.baseUrl')
    t.end()
  })
})

tape('error on baseUrl and uri with scheme-relative url', (t) => {
  request(s.url.slice('http:'.length) + '/path/ignoring/baseUrl', {
    baseUrl: s.url + '/path/'
  }, (err, resp, body) => {
    t.notEqual(err, null)
    t.equal(err.message, 'options.uri must be a path when using options.baseUrl')
    t.end()
  })
})
