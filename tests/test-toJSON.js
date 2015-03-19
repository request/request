'use strict'

var request = require('../index')
  , http = require('http')
  , tape = require('tape')

var s = http.createServer(function (req, resp) {
  resp.statusCode = 200
  resp.end('asdf')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('request().toJSON()', function(t) {
  var r = request({
    url: 'http://localhost:6767',
    headers: { foo: 'bar' }
  }, function(err, res) {
    var json_r   = JSON.parse(JSON.stringify(r))
      , json_res = JSON.parse(JSON.stringify(res))

    t.equal(err, null)

    t.equal(json_r.uri.href, r.uri.href)
    t.equal(json_r.method, r.method)
    t.equal(json_r.headers.foo, r.headers.foo)

    t.equal(json_res.statusCode, res.statusCode)
    t.equal(json_res.body, res.body)
    t.equal(json_res.headers.date, res.headers.date)

    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
