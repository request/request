'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')

var s = http.createServer(function (req, res) {
  res.statusCode = 200
  res.setHeader('X-PATH', req.url)
  res.end('ok')
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('replace params', function (t) {
  request({
    baseUrl: s.url,
    uri: '/:p1',
    uriData: { p1: 'uriData' }
  }, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(resp.headers['x-path'], '/uriData')
    t.end()
  })
})

tape('url encode values', function (t) {
  request({
    baseUrl: s.url,
    uri: '/:p1',
    uriData: { p1: '@#$%^&+=`{}<>[],;:? "/|\\' }
  }, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(resp.headers['x-path'], '/%40%23%24%25%5E%26%2B%3D%60%7B%7D%3C%3E%5B%5D%2C%3B%3A%3F%20%22%2F%7C%5C')
    t.end()
  })
})

tape('ignore params-like values in query string', function (t) {
  request({
    baseUrl: s.url,
    uri: '/:p1?qs=:qsparam',
    uriData: { p1: 'uriData', qsparam: 'ignore' }
  }, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(resp.headers['x-path'], '/uriData?qs=:qsparam')
    t.end()
  })
})

tape('error if parameter is not satisfied', function (t) {
  t.throws(function () {
    request({
      baseUrl: s.url,
      uri: '/:p1/:missingParam',
      uriData: { p1: 'uriData' }
    })
  }, /^TypeError: Expected "missingParam" to be a string$/)
  t.end()
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
