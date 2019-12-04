'use strict'

var request = require('../index')
var tape = require('tape')
var proxySocket
var proxyData = []
var called = false
var redirect = false

var proxyServer = require('net').createServer(function (sock) {
  proxySocket = sock
  if (redirect) {
    redirect = false
    return waitForData(['HTTP/1.1 200 OK\r\n\r\n'], function (data) {
      proxyData.push(data)
      waitForData([
        'HTTP/1.1 301 Moved Permanently\r\n',
        'Location: http://google.com/redirect\r\n',
        'content-length: 59\r\n',
        '\r\n'
      ], function (data) {
        proxyData.push(data)
        proxySocket.end('derp\n')
      })
    })
  }
  waitForData(['HTTP/1.1 200 OK\r\n\r\n'], function (data) {
    called = true
    proxyData.push(data)
    waitForData([
      'HTTP/1.1 200 OK\r\n',
      'content-type: text/plain\r\n',
      'content-length: 5\r\n',
      '\r\n'
    ], function (data) {
      proxyData.push(data)
      proxySocket.end('derp\n')
    })
  })
})

function waitForData (reply, callback) {
  reply = reply || []
  proxySocket.once('data', function (buffer) {
    reply.forEach(function (r) {
      proxySocket.write(r)
    })
    callback(buffer.toString())
  })
}

tape('setup', function (t) {
  proxyServer.listen(0, function () {
    proxyServer.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('proxy', function (t) {
  request({
    tunnel: true,
    url: 'http://google.com',
    proxy: proxyServer.url,
    headers: {
      'Proxy-Authorization': 'Basic dXNlcjpwYXNz',
      'authorization': 'Token deadbeef',
      'dont-send-to-proxy': 'ok',
      'dont-send-to-dest': 'ok',
      'accept': 'yo',
      'user-agent': 'just another foobar'
    },
    proxyHeaderExclusiveList: ['dont-send-to-dest']
  }, function (err, res, body) {
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
    t.equal(true, re.test(proxyData.join('')))
    t.equal(called, true, 'the request must be made to the proxy server')
    t.end()
  })
})

tape('proxy with redirect', function (t) {
  proxyData = []
  redirect = true
  called = false
  request({
    tunnel: true,
    url: 'http://google.com',
    proxy: proxyServer.url,
    headers: {
      'Proxy-Authorization': 'Basic dXNlcjpwYXNz',
      'authorization': 'Token deadbeef',
      'dont-send-to-proxy': 'ok',
      'dont-send-to-dest': 'ok',
      'accept': 'yo',
      'user-agent': 'just another foobar'
    },
    proxyHeaderExclusiveList: ['dont-send-to-dest']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'derp\n')
    t.equal(4, proxyData.length)
    t.equal(true, proxyData[0].includes('dont-send-to-dest'), 'exclusive headers should be sent to proxy server')
    t.equal(false, proxyData[1].includes('dont-send-to-dest'), 'destination should\'t receive exclusive headers')
    t.equal(true, proxyData[2].includes('dont-send-to-dest'), 'exclusive headers should be sent to proxy server')
    t.equal(false, proxyData[3].includes('dont-send-to-dest'), 'destination should\'t receive exclusive headers')
    t.equal(called, true, 'the request must be made to the proxy server')
    t.end()
  })
})

tape('cleanup', function (t) {
  proxyServer.close(function () {
    t.end()
  })
})
