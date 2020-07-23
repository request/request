var request = require('../index')
var net = require('net')
var tape = require('tape')

// Creating server using `net` as `writeHead` function of `http` module throws
// when the headers contains character outside the printable ASCII range
// Refer: https://github.com/nodejs/node/blob/v12.0.0/lib/_http_server.js#L256
var rawEchoServer = net.createServer(function (socket) {
  socket.on('data', function (chunk) {
    socket.end('HTTP/1.1 200 Работает нормально\r\n\r\n')
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
  request({ uri: rawEchoServer.url }, function (err, res, body) {
    t.equal(err, null)
    t.ok(res.statusMessage, 'Should receive status message')

    // By default, the status message string would be in `latin1` encoding
    t.equal(res.statusMessage, 'Ð Ð°Ð±Ð¾ÑÐ°ÐµÑ Ð½Ð¾ÑÐ¼Ð°Ð»ÑÐ½Ð¾')
    t.end()
  })
})

tape('with statusMessageEncoding=latin1', function (t) {
  request({
    uri: rawEchoServer.url,
    statusMessageEncoding: 'latin1'
  }, function (err, res, body) {
    t.equal(err, null)
    t.ok(res.statusMessage, 'Should receive status message')
    t.equal(res.statusMessage, 'Ð Ð°Ð±Ð¾ÑÐ°ÐµÑ Ð½Ð¾ÑÐ¼Ð°Ð»ÑÐ½Ð¾')
    t.end()
  })
})

tape('with statusMessageEncoding=utf8', function (t) {
  request({
    uri: rawEchoServer.url,
    statusMessageEncoding: 'utf8'
  }, function (err, res, body) {
    t.equal(err, null)
    t.ok(res.statusMessage, 'Should receive status message')
    t.equal(res.statusMessage, 'Работает нормально')
    t.end()
  })
})

tape('cleanup', function (t) {
  rawEchoServer.close(function () { t.end() })
})
