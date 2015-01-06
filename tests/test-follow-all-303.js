'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')

var server = http.createServer(function (req, res) {
  if (req.method === 'POST') {
    res.setHeader('location', req.url)
    res.statusCode = 303
    res.end('try again')
  } else {
    res.end('ok')
  }
})

tape('setup', function(t) {
  server.listen(6767, function() {
    t.end()
  })
})

tape('followAllRedirects with 303', function(t) {
  var redirects = 0

  request.post({
    url: 'http://localhost:6767/foo',
    followAllRedirects: true,
    form: { foo: 'bar' }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(redirects, 1)
    t.end()
  }).on('redirect', function() {
    redirects++
  })
})

tape('cleanup', function(t) {
  server.close(function() {
    t.end()
  })
})
