'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

const server = http.createServer((req, res) => {
  // redirect everything 3 times, no matter what.
  let c = req.headers.cookie

  if (!c) {
    c = 0
  } else {
    c = +c.split('=')[1] || 0
  }

  if (c > 3) {
    res.end('ok')
    return
  }

  res.setHeader('set-cookie', 'c=' + (c + 1))
  res.setHeader('location', req.url)
  res.statusCode = 302
  res.end('try again')
})

tape('setup', (t) => {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('followAllRedirects', (t) => {
  let redirects = 0

  request.post({
    url: server.url + '/foo',
    followAllRedirects: true,
    jar: true,
    form: { foo: 'bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.equal(redirects, 4)
    t.end()
  }).on('redirect', () => {
    redirects++
  })
})

tape('cleanup', (t) => {
  server.close(() => {
    t.end()
  })
})
