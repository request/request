'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')
const destroyable = require('server-destroy')

const s = server.createServer()

destroyable(s)

tape('setup', function (t) {
  s.listen(0, function () {
    s.on('/options', function (req, res) {
      res.writeHead(200, {
        'x-original-method': req.method,
        allow: 'OPTIONS, GET, HEAD'
      })

      res.end()
    })

    t.end()
  })
})

tape('options(string, function)', function (t) {
  request.options(s.url + '/options', function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['x-original-method'], 'OPTIONS')
    t.end()
  })
})

tape('options(object, function)', function (t) {
  request.options({
    url: s.url + '/options',
    headers: { foo: 'bar' }
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['x-original-method'], 'OPTIONS')
    t.end()
  })
})

tape('cleanup', function (t) {
  s.destroy(function () {
    t.end()
  })
})
