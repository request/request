'use strict'

var request = require('../index')
  , http    = require('http')
  , tape    = require('tape')

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('ok')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('should have one persistent socket for two POST requests', function(t) {
  var options = {
    url: 'http://localhost:6767',
    headers: { 'Connection':'keep-alive' },
    method: 'POST',
    body: 'name=abc',
    forever: true
   }

  request(options, function (err, response, body) {
    t.equal(err, null)
    if (!err) {
      request(options, function (err, response2, body) {
        t.equal(err, null)
        t.equal(response.socket, response2.socket)
        response.socket.destroy()
        response2.socket.destroy()
        t.end()
      })
    }
    else {
      response.socket.destroy()
      t.end()
    }
  })
})



tape('should work with forever agent', function(t) {
  var r = request.forever({maxSockets: 1})

  r({
        url: 'http://localhost:6767',
        headers: { 'Connection':'Close' }
    }, function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
