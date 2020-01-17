'use strict'

var http = require('http')
var request = require('../')
var tape = require('tape')
var destroyable = require('server-destroy')

var server = http.createServer(function (req, res) {
  var data = ''

  req.on('data', function (d) {
    data += d
  })

  req.once('end', function () {
    res.writeHead(200)
    res.end(JSON.stringify({
      headers: req.headers,
      body: data
    }))
  })
})

destroyable(server)

tape('setup', function (t) {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('with empty filename', function (t) {
  request.post({
    url: server.url,
    headers: {
      'content-type': 'multipart/mixed;'
    },
    formData: {
      formKey: {
        value: null,
        options: {
          filename: 'マイページ情報.jpg'
        }
      }
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)

    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(req.body.indexOf('filename="マイページ情報.jpg"') !== -1)
    t.ok(req.body.indexOf('filename*="UTF-8\'\'' +
      '%E3%83%9E%E3%82%A4%E3%83%98%E3%82%9A%E3%83%BC%E3%82%B7%E3%82%99%E6%83%85%E5%A0%B1.jpg"') !== -1)
    t.end()
  })
})

tape('cleanup', function (t) {
  server.destroy(function () {
    t.end()
  })
})
