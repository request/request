'use strict'

var tape = require('tape')
var destroyable = require('server-destroy')

var server = require('./server')
var request = require('../index')

function runTest (t, statusCode, followAuthorizationHeader) {
  var s = server.createServer()
  var redirects = 0
  var authHeader = 'Basic aGVsbG86d29ybGQ='

  destroyable(s)

  s.on('/', function (req, res) {
    if (req.headers.host === `${s.redirectHost}:${s.port}`) {
      res.writeHead(statusCode || 302, {
        location: `http://${s.respondHost}:${s.port}/`
      })
      res.end()
    } else if (req.headers.host === `${s.respondHost}:${s.port}`) {
      res.writeHead(200)
      res.end('ok')
    } else {
      res.writeHead(400)
      res.end('unknown host')
    }
  })

  s.listen(0, function () {
    s.redirectHost = 'test1.local.omg' // resolves to 127.0.0.1
    s.respondHost = 'test2.local.omg' // resolves to 127.0.0.1

    request({
      url: `http://${s.redirectHost}:${s.port}`,
      headers: {
        authorization: authHeader
      },
      followAllRedirects: true,
      followRedirect: true,
      followAuthorizationHeader: followAuthorizationHeader,
      lookup: function (hostname, options, callback) {
        callback(null, '127.0.0.1', 4) // All hosts will resolve to 127.0.0.1
      }
    }, function (err, res, body) {
      t.equal(err, null)
      t.equal(redirects, 1)
      t.equal(body.toString(), 'ok')
      t.equal(res.request.headers.authorization, followAuthorizationHeader ? authHeader : undefined)
      s.destroy(function () {
        t.end()
      })
    }).on('redirect', function () {
      redirects++
      t.equal(this.response.statusCode, statusCode)
      t.equal(this.uri.href, `http://${s.respondHost}:${s.port}/`)
    })
  })
}

tape('301 redirect', function (t) {
  runTest(t, 301)
})

tape('301 redirect + followAuthorizationHeader', function (t) {
  runTest(t, 301, true)
})

tape('302 redirect', function (t) {
  runTest(t, 302)
})

tape('302 redirect + followAuthorizationHeader', function (t) {
  runTest(t, 302, true)
})

tape('303 redirect', function (t) {
  runTest(t, 303)
})

tape('303 redirect + followAuthorizationHeader', function (t) {
  runTest(t, 303, true)
})

tape('307 redirect', function (t) {
  runTest(t, 307)
})

tape('307 redirect + followAuthorizationHeader', function (t) {
  runTest(t, 307, true)
})

tape('308 redirect', function (t) {
  runTest(t, 308)
})

tape('308 redirect + followAuthorizationHeader', function (t) {
  runTest(t, 308, true)
})
