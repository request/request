'use strict'

var request = require('../index')
var tape = require('tape')
var destroyable = require('server-destroy')
var server

tape('setup', function (t) {
  server = require('net').createServer(function (socket) {
    socket.on('data', function (chunk) {
      if (chunk.toString().indexOf('/redirect HTTP/1.1') !== -1) {
        socket.write('HTTP/1.1 301 Ok\r\n')
        socket.write('Location: /redirected\r\n')
        socket.write('\r\n')
        socket.write(chunk.toString())
        socket.end()
        return
      }
      socket.write('HTTP/1.1 200 Ok\r\n')
      socket.write('\r\n')
      socket.write(chunk.toString())
      socket.end()
    })
  }).listen(0, function () {
    server.port = this.address().port
    server.url = 'http://localhost:' + server.port
    destroyable(server)
    t.end()
  })
})

tape('Default GET request', function (t) {
  request({
    url: server.url
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(),
      'GET / HTTP/1.1\r\n' +
      `Host: localhost:${server.port}\r\n` +
      'Connection: close\r\n\r\n'
    )
    t.end()
  })
})

tape('Default POST request', function (t) {
  request({
    method: 'POST',
    url: server.url
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(),
      'POST / HTTP/1.1\r\n' +
      `Host: localhost:${server.port}\r\n` +
      'Content-Length: 0\r\n' +
      'Connection: close\r\n\r\n'
    )
    t.end()
  })
})

tape('Remove Host with setHost: false', function (t) {
  request({
    url: server.url,
    setHost: false
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(),
      'GET / HTTP/1.1\r\n' +
      'Connection: close\r\n\r\n'
    )
    t.end()
  })
})

tape('Empty GET packet', function (t) {
  request({
    url: server.url,
    setHost: false,
    blacklistHeaders: ['connection']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'GET / HTTP/1.1\r\n\r\n')
    t.end()
  })
})

tape('Empty POST packet', function (t) {
  request({
    method: 'POST',
    url: server.url,
    setHost: false,
    blacklistHeaders: ['connection', 'content-length', 'transfer-encoding']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'POST / HTTP/1.1\r\n\r\n')
    t.end()
  })
})

tape('Empty POSTMAN packet', function (t) {
  request({
    method: 'POSTMAN',
    url: server.url,
    setHost: false,
    blacklistHeaders: ['connection', 'content-length', 'transfer-encoding']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'POSTMAN / HTTP/1.1\r\n\r\n')
    t.end()
  })
})

tape('Blacklist Authorization', function (t) {
  request({
    url: server.url,
    auth: { username: 'foo', password: 'bar' },
    blacklistHeaders: ['authorization']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(),
      'GET / HTTP/1.1\r\n' +
      `Host: localhost:${server.port}\r\n` +
      'Connection: close\r\n\r\n'
    )
    t.end()
  })
})

tape('Blacklist custom headers', function (t) {
  request({
    url: server.url,
    headers: { h1: 'h1', H2: 'H2', h3: 'h3' },
    blacklistHeaders: ['h1', 'h2', 'H3']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(),
      'GET / HTTP/1.1\r\n' +
      `Host: localhost:${server.port}\r\n` +
      'Connection: close\r\n\r\n'
    )
    t.end()
  })
})

tape('Blacklist custom headers', function (t) {
  request({
    method: 'POST',
    url: server.url,
    formData: { foo: 'bar' },
    blacklistHeaders: ['Content-Type']
  }, function (err, res, body) {
    t.equal(err, null)
    t.ok(body.toString().indexOf('Content-Type') === -1)
    t.ok(body.toString().indexOf('Content-Length: 161') !== -1)
    t.end()
  })
})

tape('Blacklist Referer header on redirect', function (t) {
  request({
    url: server.url + '/redirect',
    followAllRedirects: true,
    blacklistHeaders: ['referer']
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(),
      'GET /redirected HTTP/1.1\r\n' +
      `Host: localhost:${server.port}\r\n` +
      'Connection: close\r\n\r\n'
    )
    t.end()
  })
})

tape('cleanup', function (t) {
  server.destroy(function () {
    t.end()
  })
})
