'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

let port1
let port2

const s1 = http.createServer((req, resp) => {
  if (req.url === '/original') {
    resp.writeHeader(302, {
      'location': '/redirected'
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

const s2 = http.createServer((req, resp) => {
  const x = request('http://localhost:' + port1 + '/original')
  req.pipe(x)
  x.pipe(resp)
})

tape('setup', (t) => {
  s1.listen(0, function () {
    port1 = this.address().port
    s2.listen(0, function () {
      port2 = this.address().port
      t.end()
    })
  })
})

tape('piped redirect', (t) => {
  request('http://localhost:' + port2 + '/original', (err, res, body) => {
    t.equal(err, null)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('cleanup', (t) => {
  s1.close(() => {
    s2.close(() => {
      t.end()
    })
  })
})
