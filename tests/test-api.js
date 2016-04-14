'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')
  , server


tape('setup', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    res.writeHead(202)
    req.pipe(res)
  })
  server.listen(6767, t.end)
})

tape('callback option', function (t) {
  request({
    url: 'http://localhost:6767',
    callback: function (err, res, body) {
      t.equal(res.statusCode, 202)
      t.end()
    }
  })
})

tape('cleanup', function(t) {
  server.close(t.end)
})
