'use strict'

const request = require('../index')
const http = require('http')
const tape = require('tape')

const s = http.createServer((req, resp) => {
  resp.statusCode = 200
  resp.end('asdf')
})

tape('setup', t => {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('request().toJSON()', t => {
  const r = request(
    {
      url: s.url,
      headers: { foo: 'bar' }
    },
    (err, res) => {
      const jsonR = JSON.parse(JSON.stringify(r))
      const jsonRes = JSON.parse(JSON.stringify(res))

      t.equal(err, null)

      t.equal(jsonR.uri, r.uri.toString())
      t.equal(jsonR.method, r.method)
      t.equal(jsonR.headers.foo, r.headers.foo)

      t.equal(jsonRes.statusCode, res.statusCode)
      t.equal(jsonRes.body, res.body)
      t.equal(jsonRes.headers.date, res.headers.date)

      t.end()
    }
  )
})

tape('cleanup', t => {
  s.close(() => {
    t.end()
  })
})
