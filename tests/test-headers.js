'use strict'

var server = require('./server')
  , request = require('../index')
  , util = require('util')
  , tape = require('tape')

var s = server.createServer()

s.on('/redirect/from', function(req, res) {
  res.writeHead(301, {
    location : '/redirect/to'
  })
  res.end()
})

s.on('/redirect/to', function(req, res) {
  res.end('ok')
})

s.on('/headers.json', function(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  })

  res.end(JSON.stringify(req.headers))
})

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

function runTest(name, path, requestObj, serverAssertFn) {
  tape(name, function(t) {
    s.on('/' + path, function(req, res) {
      serverAssertFn(t, req, res)
      res.writeHead(200)
      res.end()
    })
    requestObj.url = s.url + '/' + path
    request(requestObj, function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.end()
    })
  })
}

runTest(
  '#125: headers.cookie with no cookie jar',
  'no-jar',
  {headers: {cookie: 'foo=bar'}},
  function(t, req, res) {
    t.equal(req.headers.cookie, 'foo=bar')
  })

var jar = request.jar()
jar.setCookie('quux=baz', s.url)
runTest(
  '#125: headers.cookie + cookie jar',
  'header-and-jar',
  {jar: jar, headers: {cookie: 'foo=bar'}},
  function(t, req, res) {
    t.equal(req.headers.cookie, 'foo=bar; quux=baz')
  })

var jar2 = request.jar()
jar2.setCookie('quux=baz; Domain=foo.bar.com', s.url, {ignoreError: true})
runTest(
  '#794: ignore cookie parsing and domain errors',
  'ignore-errors',
  {jar: jar2, headers: {cookie: 'foo=bar'}},
  function(t, req, res) {
    t.equal(req.headers.cookie, 'foo=bar')
  })

runTest(
  '#784: override content-type when json is used',
  'json',
  {
    json: true,
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=UTF-8' },
    body: { hello: 'my friend' }},
  function(t, req, res) {
    t.equal(req.headers['content-type'], 'application/json; charset=UTF-8')
  }
)

runTest(
  'neither headers.cookie nor a cookie jar is specified',
  'no-cookie',
  {},
  function(t, req, res) {
    t.equal(req.headers.cookie, undefined)
  })

tape('upper-case Host header and redirect', function(t) {
  // Horrible hack to observe the raw data coming to the server (before Node
  // core lower-cases the headers)
  var rawData = ''

  s.on('connection', function(socket) {
    if (socket.ondata) {
      var ondata = socket.ondata
    }
    function handledata (d, start, end) {
      if (ondata) {
        rawData += d.slice(start, end).toString()
        return ondata.apply(this, arguments)
      } else {
        rawData += d
      }
    }
    socket.on('data', handledata)
    socket.ondata = handledata
  })

  function checkHostHeader(host) {
    t.ok(
      new RegExp('^Host: ' + host + '$', 'm').test(rawData),
      util.format(
        'Expected "Host: %s" in data "%s"',
        host, rawData.trim().replace(/\r?\n/g, '\\n')))
    rawData = ''
  }

  var redirects = 0
  request({
    url : s.url + '/redirect/from',
    headers : { Host : '127.0.0.1' }
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'ok')
    t.equal(redirects, 1)
    // XXX should the host header change like this after a redirect?
    checkHostHeader('localhost:' + s.port)
    t.end()
  }).on('redirect', function() {
    redirects++
    t.equal(this.uri.href, s.url + '/redirect/to')
    checkHostHeader('127.0.0.1')
  })
})

tape('undefined headers', function(t) {
  request({
    url: s.url + '/headers.json',
    headers: {
      'X-TEST-1': 'test1',
      'X-TEST-2': undefined
    },
    json: true
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(body['x-test-1'], 'test1')
    t.equal(typeof body['x-test-2'], 'undefined')
    t.end()
  })
})

tape('catch invalid characters error - GET', function(t) {
  request({
    url: s.url + '/headers.json',
    headers: {
      'test': 'אבגד'
    }
  }, function(err, res, body) {
    t.equal(err.message, 'The header content contains invalid characters')
  })
  .on('error', function (err) {
    t.equal(err.message, 'The header content contains invalid characters')
    t.end()
  })
})

tape('catch invalid characters error - POST', function(t) {
  request({
    method: 'POST',
    url: s.url + '/headers.json',
    headers: {
      'test': 'אבגד'
    },
    body: 'beep'
  }, function(err, res, body) {
    t.equal(err.message, 'The header content contains invalid characters')
  })
  .on('error', function (err) {
    t.equal(err.message, 'The header content contains invalid characters')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
