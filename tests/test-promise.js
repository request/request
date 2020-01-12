'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')
const Promise = require('bluebird')

const s = http.createServer((req, res) => {
  res.writeHead(200, {})
  res.end('ok')
})

tape('setup', (t) => {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('promisify convenience method', (t) => {
  const get = request.get
  const p = Promise.promisify(get, {multiArgs: true})
  p(s.url)
    .then((results) => {
      const res = results[0]
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('promisify request function', (t) => {
  const p = Promise.promisify(request, {multiArgs: true})
  p(s.url)
    .spread((res, body) => {
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('promisify all methods', (t) => {
  Promise.promisifyAll(request, {multiArgs: true})
  request.getAsync(s.url)
    .spread((res, body) => {
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
