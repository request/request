var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , fs = require('fs')
  , request = require('../index')
  , path = require('path')
  , util = require('util')
  ;

var port = 6768
  , called = false
  , proxiedHost = 'google.com'
  , expectProxyHeaders = {
      accept: 'yo',
      'proxy-connection': 'close',
      'user-agent': 'just another foobar',
      host: 'google.com'
    }
  , data = ""
  , expect =
      "CONNECT google.com:80 HTTP/1.1\r\n" +
      "accept: yo\r\n" +
      "proxy-connection: close\r\n" +
      "user-agent: just another foobar\r\n" +
      "host: google.com:80\r\n" +
      "Proxy-Authorization: Basic dXNlcjpwYXNz\r\n" +
      "\r\n" +
      "GET / HTTP/1.1\r\n" +
      "authorization: Token deadbeef\r\n" +
      "do-not-send-this: ok\r\n" +
      "accept: yo\r\n" +
      "proxy-connection: close\r\n" +
      "user-agent: just another foobar\r\n" +
      "host: google.com\r\n" +
      "\r\n"
  ;

var s = require('net').createServer(function (sock) {
  s.close()
  called = true
  sock.once("data", function (c) {
    console.error("server got data")
    data += c

    sock.write("HTTP/1.1 200 OK\r\n\r\n")

    sock.once("data", function (c) {
      console.error("server got data again")
      data += c

      sock.write("HTTP/1.1 200 OK\r\n")
      sock.write("content-type: text/plain\r\n")
      sock.write("content-length: 5\r\n")
      sock.write("\r\n")
      sock.end("derp\n")
    })
  })
})
s.listen(port, function () {
  request ({
    tunnel: true,
    url: 'http://'+proxiedHost,
    proxy: 'http://user:pass@localhost:'+port,
    headers: {
      authorization: 'Token deadbeef',
      'do-not-send-this': 'ok',
      accept: 'yo',
      'proxy-connection': 'close',
      'user-agent': 'just another foobar'
    }
    /*
    //should behave as if these arguments where passed:
    url: 'http://localhost:'+port,
    headers: {host: proxiedHost}
    //*/
  }, function (err, res, body) {
    gotResp = true
    assert.equal(body, "derp\n")
    assert.equal(data, expect)
  }).end()
})

process.on('exit', function () {
  assert.ok(called, 'the request must be made to the proxy server')
  assert.ok(gotResp, "got request")
})
