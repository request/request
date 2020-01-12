'use strict'

const request = require('../index')
const http = require('http')
const tape = require('tape')

const s = http.createServer((req, resp) => {
  resp.statusCode = 200
  resp.end('')
})

tape('setup', (t) => {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('empty body with encoding', (t) => {
  request(s.url, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, '')
    t.end()
  })
})

tape('empty body without encoding', (t) => {
  request({
    url: s.url,
    encoding: null
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.same(body, Buffer.alloc(0))
    t.end()
  })
})

tape('empty JSON body', (t) => {
  request({
    url: s.url,
    json: {}
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, undefined)
    t.end()
  })
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
