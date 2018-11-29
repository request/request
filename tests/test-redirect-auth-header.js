'use strict'

var tape = require('tape')
var destroyable = require('server-destroy')

var server = require('./server')
var request = require('../index')

var s = server.createServer()

destroyable(s)

s.on('/', function (req, res) {
  if (req.headers.host === `${s.redirectHost}:${s.port}`) {
    res.writeHead(302, { location: `http://${s.respondHost}:${s.port}/` })
    res.end()
  }
  else if (req.headers.host === `${s.respondHost}:${s.port}`) {
    res.writeHead(200)
    res.end('ok')
  }
  else {
    res.writeHead(400)
    res.end('unknown host')
  }
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.redirectHost = 'test1.local.omg' // resolves to 127.0.0.1
    s.respondHost = 'test2.local.omg' // resolves to 127.0.0.1
    t.end()
  })
})

tape('drop authorization header when redirects to different host', function (t) {
  var redirects = 0
  var authHeader = 'Basic aGVsbG86d29ybGQ='

  request({
    url: `http://${s.redirectHost}:${s.port}/`,
    headers: {
      authorization: authHeader
    },
    followAllRedirects: true,
    followRedirect: true,
    lookup: function (hostname, options, callback) {
      callback(null, '127.0.0.1', 4) // All hosts will resolve to 127.0.0.1
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(redirects, 1)
    t.equal(body.toString(), 'ok')
    t.equal(res.request.headers.authorization, undefined)
    t.end()
  }).on('redirect', function () {
    redirects++
    t.equal(this.uri.href, `http://${s.respondHost}:${s.port}/`)
  })
})

tape('retain authorization header on redirects when using followAuthorizationHeader', function (t) {
  var redirects = 0
  var authHeader = 'Basic aGVsbG86d29ybGQ='

  request({
    url: `http://${s.redirectHost}:${s.port}/`,
    headers: {
      authorization: authHeader
    },
    followAllRedirects: true,
    followRedirect: true,
    followAuthorizationHeader: true,
    lookup: function (hostname, options, callback) {
      callback(null, '127.0.0.1', 4) // All hosts will resolve to 127.0.0.1
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(redirects, 1)
    t.equal(body.toString(), 'ok')
    t.equal(res.request.headers.authorization, authHeader)
    t.end()
  }).on('redirect', function () {
    redirects++
    t.equal(this.uri.href, `http://${s.respondHost}:${s.port}/`)
  })
})

tape('cleanup', function (t) {
  s.destroy(function () {
    t.end()
  })
})
