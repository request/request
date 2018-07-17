'use strict'

var request = require('../index')
var http = require('http')
var tape = require('tape')

var s = http.createServer(function (req, resp) {
  resp.statusCode = 200
  resp.end('')
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('empty body with encoding', function (t) {
  request(s.url, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, '')
    t.end()
  })
})

tape('empty body without encoding', function (t) {
  request({
    url: s.url,
    encoding: null
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.same(body, Buffer.alloc(0))
    t.end()
  })
})

tape('empty JSON body', function (t) {
  request({
    url: s.url,
    json: {}
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, undefined)
    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
