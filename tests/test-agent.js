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
