'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('ok')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('delayed read', function(t) {
  var readStream = request('http://localhost:6767')

  // wait for 1 second, then pipe
  setTimeout(function() {
    readStream.on('data', function (chunk) {
      t.equal(chunk.toString('utf8'), 'ok')
      t.end()
    })
  }, 1000)
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
