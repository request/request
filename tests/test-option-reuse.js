'use strict'

const request = require('../index')
const http = require('http')
const tape = require('tape')

const methodsSeen = {
  head: 0,
  get: 0
}

const s = http.createServer(function (req, res) {
  res.statusCode = 200
  res.end('ok')

  methodsSeen[req.method.toLowerCase()]++
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('options object is not mutated', function (t) {
  const url = s.url
  const options = { url: url }

  request.head(options, function (err, resp, body) {
    t.equal(err, null)
    t.equal(body, '')
    t.equal(Object.keys(options).length, 1)
    t.equal(options.url, url)

    request.get(options, function (err, resp, body) {
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

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
