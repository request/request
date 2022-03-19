'use strict'

const request = require('../index')
const http = require('http')
const tape = require('tape')

const s = http.createServer(function (req, resp) {
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
  const r = request({
    url: s.url,
    headers: { foo: 'bar' }
  }, function (err, res) {
    const jsonR = JSON.parse(JSON.stringify(r))
    const jsonRes = JSON.parse(JSON.stringify(res))

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
