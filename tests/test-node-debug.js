'use strict'

const request = require('../index')
const http = require('http')
const tape = require('tape')

const s = http.createServer((req, res) => {
  res.statusCode = 200
  res.end('')
})

let stderr = []
let prevStderrLen = 0

tape('setup', t => {
  process.stderr._oldWrite = process.stderr.write
  process.stderr.write = (string, encoding, fd) => {
    stderr.push(string)
  }

  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('a simple request should not fail with debugging enabled', t => {
  request.debug = true
  t.equal(
    request.Request.debug,
    true,
    'request.debug sets request.Request.debug'
  )
  t.equal(request.debug, true, 'request.debug gets request.Request.debug')
  stderr = []

  request(s.url, (err, res, body) => {
    t.ifError(err, 'the request did not fail')
    t.ok(res, 'the request did not fail')

    t.ok(stderr.length, 'stderr has some messages')
    const url = s.url.replace(/\//g, '\\/')
    const patterns = [
      /^REQUEST { uri: /,
      new RegExp('^REQUEST make request ' + url + '/\n$'),
      /^REQUEST onRequestResponse /,
      /^REQUEST finish init /,
      /^REQUEST response end /,
      /^REQUEST end event /,
      /^REQUEST emitting complete /
    ]
    patterns.forEach(pattern => {
      let found = false
      stderr.forEach(msg => {
        if (pattern.test(msg)) {
          found = true
        }
      })
      t.ok(found, 'a log message matches ' + pattern)
    })
    prevStderrLen = stderr.length
    t.end()
  })
})

tape('there should be no further lookups on process.env', t => {
  process.env.NODE_DEBUG = ''
  stderr = []

  request(s.url, (err, res, body) => {
    t.ifError(err, 'the request did not fail')
    t.ok(res, 'the request did not fail')
    t.equal(stderr.length, prevStderrLen, 'env.NODE_DEBUG is not retested')
    t.end()
  })
})

tape('it should be possible to disable debugging at runtime', t => {
  request.debug = false
  t.equal(
    request.Request.debug,
    false,
    'request.debug sets request.Request.debug'
  )
  t.equal(request.debug, false, 'request.debug gets request.Request.debug')
  stderr = []

  request(s.url, (err, res, body) => {
    t.ifError(err, 'the request did not fail')
    t.ok(res, 'the request did not fail')
    t.equal(stderr.length, 0, 'debugging can be disabled')
    t.end()
  })
})

tape('cleanup', t => {
  process.stderr.write = process.stderr._oldWrite
  delete process.stderr._oldWrite

  s.close(() => {
    t.end()
  })
})
