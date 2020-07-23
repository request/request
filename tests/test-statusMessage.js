var request = require('../index')
var net = require('net')
var tape = require('tape')

// Creating server using `net` as `writeHead` function of `http` module throws
// when the headers contains character outside the printable ASCII range
// Refer: https://github.com/nodejs/node/blob/v12.0.0/lib/_http_server.js#L256
var rawEchoServer = net.createServer(function (socket) {
  socket.on('data', function (chunk) {
    socket.write('HTTP/1.1 200 Работает нормально\r\n')
    socket.write('\r\n')
    socket.write(chunk.toString())
    socket.end()
  })
})

tape('setup', function (t) {
  rawEchoServer.listen(0, function () {
    rawEchoServer.port = this.address().port
    rawEchoServer.url = 'http://localhost:' + rawEchoServer.port
    t.end()
  })
})

tape('with no statusMessageEncoding option', function (t) {
  var options = {
    uri: rawEchoServer.url
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(res.statusMessage, 'Should receive status message')
    t.equal(res.statusMessage, 'Ð Ð°Ð±Ð¾ÑÐ°ÐµÑ Ð½Ð¾ÑÐ¼Ð°Ð»ÑÐ½Ð¾')
    t.end()
  })
})

tape('with statusMessageEncoding=latin1', function (t) {
  var options = {
    uri: rawEchoServer.url,
    statusMessageEncoding: 'latin1'
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(res.statusMessage, 'Should receive status message')
    t.equal(res.statusMessage, 'Ð Ð°Ð±Ð¾ÑÐ°ÐµÑ Ð½Ð¾ÑÐ¼Ð°Ð»ÑÐ½Ð¾')
    t.end()
  })
})

tape('with statusMessageEncoding=utf-8', function (t) {
  var options = {
    uri: rawEchoServer.url,
    statusMessageEncoding: 'utf8'
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(res.statusMessage, 'Should receive status message')
    t.equal(res.statusMessage, 'Работает нормально')
    t.end()
  })
})

tape('cleanup', function (t) {
  rawEchoServer.close(function () { t.end() })
})
