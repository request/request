'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')
var server

tape('setup', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    res.writeHead(202)
    req.pipe(res)
  })
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('callback option', function (t) {
  request({
    url: server.url,
    callback: function (err, res, body) {
      t.error(err)
      t.equal(res.statusCode, 202)
      t.end()
    }
  })
})

tape('cleanup', function (t) {
  server.close(t.end)
})
