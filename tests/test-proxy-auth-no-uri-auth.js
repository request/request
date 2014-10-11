var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , fs = require('fs')
  , request = require('../index')
  , path = require('path')
  , util = require('util')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

tape('proxy', function(t) {
  var called = false

  s.on('http://google.com/', function(req, res) {
    called = true
    t.equal(req.headers.host, 'google.com')
    t.equal(req.headers['proxy-authorization'], 'Basic dXNlcjpwYXNz')
    t.equal(req.headers.authorization, undefined)
    res.writeHeader(200)
    res.end()
  })

  request ({
    url: 'http://google.com',
    proxy: 'http://user:pass@localhost:' + s.port
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(called, true, 'the request must be made to the proxy server')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
