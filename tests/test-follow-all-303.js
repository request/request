'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')

var server = http.createServer(function (req, res) {
  if (req.method === 'POST') {
    res.setHeader('location', req.url)
    res.statusCode = 303
    res.end('try again')
  } else {
    res.end('ok')
  }
})

tape('setup', function (t) {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('followAllRedirects with 303', function (t) {
  var redirects = 0

  request.post({
    url: server.url + '/foo',
    followAllRedirects: true,
    form: { foo: 'bar' }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
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
