'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')

var server = http.createServer()
server.on('request', function (req, res) {
  res.end(req.url)
})

tape('setup', function (t) {
  server.listen(6767, t.end)
})

tape('encode non ASCII characters using UTF-8', function (t) {
  request({
    method: 'GET',
    url: 'http://localhost:6767/котка.png',
    callback: function (err, res, path) {
      t.equal(err, null, 'encode non ASCII characters using UTF-8 Failed')
      t.equal(path, '/%D0%BA%D0%BE%D1%82%D0%BA%D0%B0.png')
      t.equal(decodeURI(path), '/котка.png')
      t.end()
    }
  })
})

tape('cleanup', function (t) {
  server.close(t.end)
})
