'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')
const Promise = require('bluebird')

const s = http.createServer(function (req, res) {
  res.writeHead(200, {})
  res.end('ok')
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('promisify convenience method', function (t) {
  const get = request.get
  const p = Promise.promisify(get, { multiArgs: true })
  p(s.url)
    .then(function (results) {
      const res = results[0]
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('promisify request function', function (t) {
  const p = Promise.promisify(request, { multiArgs: true })
  p(s.url)
    .spread(function (res, body) {
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('promisify all methods', function (t) {
  Promise.promisifyAll(request, { multiArgs: true })
  request.getAsync(s.url)
    .spread(function (res, body) {
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
