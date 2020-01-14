'use strict'

const request = require('../index')
const http = require('http')
const fs = require('fs')
const rimraf = require('rimraf')
const assert = require('assert')
const tape = require('tape')

const rawPath = [null, 'raw', 'path'].join('/')
const queryPath = [null, 'query', 'path'].join('/')
const searchString = '?foo=bar'
const socket = [__dirname, 'tmp-socket'].join('/')
const rawPathname = socket + ':' + rawPath
const queryPathname = socket + ':' + queryPath
const expectedBody = 'connected'
const statusCode = 200

rimraf.sync(socket)

const s = http.createServer((req, res) => {
  const incomingUrl = new URL(req.url, 'http://unix/')
  switch (incomingUrl.pathname) {
    case rawPathname:
      assert.strictEqual(
        incomingUrl.pathname,
        rawPathname,
        'requested path is sent to server'
      )
      break

    case queryPathname:
      assert.strictEqual(
        incomingUrl.pathname,
        queryPathname,
        'requested path is sent to server'
      )
      assert.strictEqual(
        incomingUrl.search,
        searchString,
        'query string is sent to server'
      )
      break

    default:
      assert(false, 'A valid path was requested')
  }
  res.statusCode = statusCode
  res.end(expectedBody)
})

tape('setup', t => {
  s.listen(socket, () => {
    t.end()
  })
})

tape('unix socket connection', t => {
  request('http://unix:' + socket + ':' + rawPath, (err, res, body) => {
    t.equal(err, null, 'no error in connection')
    t.equal(res.statusCode, statusCode, 'got HTTP 200 OK response')
    t.equal(body, expectedBody, 'expected response body is received')
    t.end()
  })
})

tape('unix socket connection with qs', t => {
  request(
    {
      uri: 'http://unix:' + socket + ':' + queryPath,
      qs: {
        foo: 'bar'
      }
    },
    (err, res, body) => {
      t.equal(err, null, 'no error in connection')
      t.equal(res.statusCode, statusCode, 'got HTTP 200 OK response')
      t.equal(body, expectedBody, 'expected response body is received')
      t.end()
    }
  )
})

tape('cleanup', t => {
  s.close(() => {
    fs.unlink(socket, () => {
      t.end()
    })
  })
})
