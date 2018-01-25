'use strict'

var request = require('../index')
var http = require('http')
var tape = require('tape')

var s = http.createServer(function (req, resp) {
  resp.statusCode = 200
  resp.end('asdf')
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('request().toJSON()', function (t) {
  var r = request({
    url: s.url,
    headers: { foo: 'bar' }
  }, function (err, res) {
    var jsonR = JSON.parse(JSON.stringify(r))
    var jsonRes = JSON.parse(JSON.stringify(res))

    t.equal(err, null)

    t.equal(jsonR.uri.href, r.uri.href)
    t.equal(jsonR.method, r.method)
    t.equal(jsonR.headers.foo, r.headers.foo)

    t.equal(jsonRes.statusCode, res.statusCode)
    t.equal(jsonRes.body, res.body)
    t.equal(jsonRes.headers.date, res.headers.date)

    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
