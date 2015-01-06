'use strict'

var server = require('./server')
  , request = require('../index')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    s.on('/', function(req, res) {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.write('waited')
      res.end()
    })
    t.end()
  })
})

tape('should emit socket event', function(t) {
  t.plan(4)

  var req = request(s.url, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'waited')
  })

  req.on('socket', function(socket) {
    var requestSocket = req.req.socket
    t.equal(requestSocket, socket)
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
