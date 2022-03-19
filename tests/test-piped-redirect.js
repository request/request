'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

let port1
let port2

const s1 = http.createServer(function (req, resp) {
  if (req.url === '/original') {
    resp.writeHeader(302, {
      location: '/redirected'
    })
    resp.end()
  } else if (req.url === '/redirected') {
    resp.writeHeader(200, {
      'content-type': 'text/plain'
    })
    resp.write('OK')
    resp.end()
  }
})

const s2 = http.createServer(function (req, resp) {
  const x = request('http://localhost:' + port1 + '/original')
  req.pipe(x)
  x.pipe(resp)
})

tape('setup', function (t) {
  s1.listen(0, function () {
    port1 = this.address().port
    s2.listen(0, function () {
      port2 = this.address().port
      t.end()
    })
  })
})

tape('piped redirect', function (t) {
  request('http://localhost:' + port2 + '/original', function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('cleanup', function (t) {
  s1.close(function () {
    s2.close(function () {
      t.end()
    })
  })
})
