'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')

// test data
var redirecter = 'test1.local.omg' // always resolves to 127.0.0.1
var responder = 'test2.local.omg'  // this too.

var server = http.createServer(function (req, res) {
  if (req.headers.host.indexOf(redirecter) === 0) {
    res.setHeader('location', `http://${responder}:${port}/foo`)
    res.statusCode = 307
    return res.end('try again')
  } else if (req.headers.host.indexOf(responder) === 0) {
    res.statusCode = 200
    return res.end('ok')
  }

  res.statusCode = 404
  return res.end('not found')
})

var port

tape('setup', function (t) {
  server.listen(0, function () {
    port = this.address().port
    t.end()
  })
})

tape('307 redirect should work when host is set explicitly, but changes on redirect', function (t) {
  var redirects = 0

  request({
    url: `http://${redirecter}:${port}/foo`,
    headers: {
      Host: redirecter
    },
    followAllRedirects: true,
    followRedirect: true,
    encoding: null,
    lookup: function (hostname, options, callback) {
      callback(null, '127.0.0.1', 4)  // All hosts will resolve to 127.0.0.1
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'ok')
    t.equal(redirects, 1)
    t.end()
  }).on('redirect', function () {
    redirects++
  })
})

tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})
