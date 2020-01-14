'use strict'

const http = require('http')
const assert = require('assert')
const request = require('../index')
const tape = require('tape')

const server = http.createServer((req, resp) => {
  resp.statusCode = 200
  if (req.url === '/get') {
    assert.strictEqual(req.method, 'GET')
    resp.write('content')
    resp.end()
    return
  }
  if (req.url === '/put') {
    let x = ''
    assert.strictEqual(req.method, 'PUT')
    req.on('data', chunk => {
      x += chunk
    })
    req.on('end', () => {
      assert.strictEqual(x, 'content')
      resp.write('success')
      resp.end()
    })
    return
  }
  if (req.url === '/proxy') {
    assert.strictEqual(req.method, 'PUT')
    req.pipe(request(server.url + '/put')).pipe(resp)
    return
  }
  if (req.url === '/test') {
    request(server.url + '/get')
      .pipe(request.put(server.url + '/proxy'))
      .pipe(resp)
    return
  }
  throw new Error('Unknown url', req.url)
})

tape('setup', t => {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('chained one-line proxying', t => {
  request(server.url + '/test', (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'success')
    t.end()
  })
})

tape('cleanup', t => {
  server.close(() => {
    t.end()
  })
})
