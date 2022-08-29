'use strict'

const server = require('./server')
const request = require('../index')
const events = require('events')
const tape = require('tape')
const destroyable = require('server-destroy')

const s = server.createServer()
const ss = server.createSSLServer()
const e = new events.EventEmitter()

destroyable(s)
destroyable(ss)

function bouncy (s, serverUrl) {
  const redirs = {
    a: 'b',
    b: 'c',
    c: 'd',
    d: 'e',
    e: 'f',
    f: 'g',
    g: 'h',
    h: 'end'
  }

  let perm = true
  Object.keys(redirs).forEach(function (p) {
    const t = redirs[p]

    // switch type each time
    const type = perm ? 301 : 302
    perm = !perm
    s.on('/' + p, function (req, res) {
      setTimeout(function () {
        res.writeHead(type, { location: serverUrl + '/' + t })
        res.end()
      }, Math.round(Math.random() * 25))
    })
  })

  s.on('/end', function (req, res) {
    const key = req.headers['x-test-key']
    e.emit('hit-' + key, key)
    res.writeHead(200)
    res.end(key)
  })
}

tape('setup', function (t) {
  s.listen(0, function () {
    ss.listen(0, function () {
      bouncy(s, ss.url)
      bouncy(ss, s.url)
      t.end()
    })
  })
})

tape('lots of redirects', function (t) {
  const n = 10
  t.plan(n * 4)

  function doRedirect (i) {
    const key = 'test_' + i
    request({
      url: (i % 2 ? s.url : ss.url) + '/a',
      headers: { 'x-test-key': key },
      rejectUnauthorized: false
    }, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, key)
    })

    e.once('hit-' + key, function (v) {
      t.equal(v, key)
    })
  }

  for (let i = 0; i < n; i++) {
    doRedirect(i)
  }
})

tape('cleanup', function (t) {
  s.destroy(function () {
    ss.destroy(function () {
      t.end()
    })
  })
})
