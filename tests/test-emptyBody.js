'use strict'

var request = require('../index')
  , http = require('http')
  , tape = require('tape')

var s = http.createServer(function (req, resp) {
  resp.statusCode = 200
  resp.end('')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('empty body with encoding', function(t) {
  request('http://localhost:6767', function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, '')
    t.end()
  })
})

tape('empty body without encoding', function(t) {
  request({
    url: 'http://localhost:6767',
    encoding: null
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.same(body, new Buffer(0))
    t.end()
  })
})

tape('empty JSON body', function(t) {
  request({
    url: 'http://localhost:6767',
    json: {}
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, undefined)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
