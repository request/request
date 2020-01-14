'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    res.setHeader('location', req.url)
    res.statusCode = 303
    res.end('try again')
  } else {
    res.end('ok')
  }
})

tape('setup', t => {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('followAllRedirects with 303', t => {
  let redirects = 0

  request
    .post(
      {
        url: server.url + '/foo',
        followAllRedirects: true,
        form: { foo: 'bar' }
      },
      (err, res, body) => {
        t.equal(err, null)
        t.equal(body, 'ok')
        t.equal(redirects, 1)
        t.end()
      }
    )
    .on('redirect', () => {
      redirects++
    })
})

tape('cleanup', t => {
  server.close(() => {
    t.end()
  })
})
