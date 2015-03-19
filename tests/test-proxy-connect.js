'use strict'

var request = require('../index')
  , tape = require('tape')

var port = 6768
  , called = false
  , proxiedHost = 'google.com'
  , data = ''

var s = require('net').createServer(function(sock) {
  called = true
  sock.once('data', function (c) {
    data += c

    sock.write('HTTP/1.1 200 OK\r\n\r\n')

    sock.once('data', function (c) {
      data += c

      sock.write('HTTP/1.1 200 OK\r\n')
      sock.write('content-type: text/plain\r\n')
      sock.write('content-length: 5\r\n')
      sock.write('\r\n')
      sock.end('derp\n')
    })
  })
})

tape('setup', function(t) {
  s.listen(port, function() {
    t.end()
  })
})

tape('proxy', function(t) {
  request({
    tunnel: true,
    url: 'http://' + proxiedHost,
    proxy: 'http://localhost:' + port,
    headers: {
      'Proxy-Authorization' : 'Basic dXNlcjpwYXNz',
      'authorization'       : 'Token deadbeef',
      'dont-send-to-proxy'  : 'ok',
      'dont-send-to-dest'   : 'ok',
      'accept'              : 'yo',
      'user-agent'          : 'just another foobar'
    },
    proxyHeaderExclusiveList: ['Dont-send-to-dest']
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'derp\n')
    var re = new RegExp([
      'CONNECT google.com:80 HTTP/1.1',
      'Proxy-Authorization: Basic dXNlcjpwYXNz',
      'dont-send-to-dest: ok',
      'accept: yo',
      'user-agent: just another foobar',
      'host: google.com:80',
      'Connection: close',
      '',
      'GET / HTTP/1.1',
      'authorization: Token deadbeef',
      'dont-send-to-proxy: ok',
      'accept: yo',
      'user-agent: just another foobar',
      'host: google.com'
    ].join('\r\n'))
    t.equal(true, re.test(data))
    t.equal(called, true, 'the request must be made to the proxy server')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
