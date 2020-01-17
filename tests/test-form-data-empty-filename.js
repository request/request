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
        value: null, // should not throw "null" value
        options: {
          filename: '' // should treat this as a file with empty filename
        }
      }
    }
  }, function (err, res, body) {
    var req = JSON.parse(body)

    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(req.body.indexOf('Content-Disposition: form-data; name="formKey"; filename=""') !== -1)
    t.end()
  })
})

tape('cleanup', function (t) {
  server.destroy(function () {
    t.end()
  })
})
