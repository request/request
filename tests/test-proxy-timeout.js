'use strict'

var request = require('../index')
  , tape = require('tape')

var proxiedHost = 'google.com'
  , data = ''

var s = require('net').createServer(function(sock) {
  sock.once('data', function (c) {
    data += c
  })
})

tape('setup', function(t) {
  s.listen(0, function() {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('proxy opts.proxy.timeout', function(t) {
  request({
    tunnel: true,
    url: 'http://' + proxiedHost,
    proxy: { port: s.address().port, hostname: 'localhost', timeout: 100 }
  }, function(err, res, body) {
    t.notEqual(err, null)
    t.ok(err.code === 'ECONNRESET')
    t.end()
  })
})

tape('proxy opts.timeout', function(t) {
  request({
    tunnel: true,
    url: 'http://' + proxiedHost,
    proxy: s.url,
    timeout: 100
  }, function(err, res, body) {
    t.notEqual(err, null)
    t.ok(err.code === 'ECONNRESET')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
