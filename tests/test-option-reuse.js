'use strict'

var request = require('../index')
  , http = require('http')
  , tape = require('tape')

var methodsSeen = {
  head: 0,
  get: 0
}

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('ok')

  methodsSeen[req.method.toLowerCase()]++
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('options object is not mutated', function(t) {
  var url = 'http://localhost:6767'
  var options = { url: url }

  request.head(options, function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, '')
    t.equal(Object.keys(options).length, 1)
    t.equal(options.url, url)

    request.get(options, function(err, resp, body) {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.equal(Object.keys(options).length, 1)
      t.equal(options.url, url)

      t.equal(methodsSeen.head, 1)
      t.equal(methodsSeen.get, 1)

      t.end()
    })
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
