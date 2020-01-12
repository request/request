'use strict'

const assert = require('assert')
const http = require('http')
const request = require('../index')
const tape = require('tape')

let numBearerRequests = 0
let bearerServer

tape('setup', (t) => {
  bearerServer = http.createServer((req, res) => {
    numBearerRequests++

    let ok

    if (req.headers.authorization) {
      if (req.headers.authorization === 'Bearer theToken') {
        ok = true
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false
      res.setHeader('www-authenticate', 'Bearer realm="Private"')
    }

    if (req.url === '/post/') {
      const expectedContent = 'data_key=data_value'
      req.on('data', (data) => {
        assert.strictEqual(Buffer.from(data).toString(), expectedContent)
      })
      assert.strictEqual(req.method, 'POST')
      assert.strictEqual(req.headers['content-length'], '' + expectedContent.length)
      assert.strictEqual(req.headers['content-type'], 'application/x-www-form-urlencoded')
    }

    if (ok) {
      res.end('ok')
    } else {
      res.statusCode = 401
      res.end('401')
    }
  }).listen(0, function () {
    bearerServer.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('bearer auth', (t) => {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test/',
    auth: {
      bearer: 'theToken',
      sendImmediately: false
    }
  }, (error, res, body) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 2)
    t.end()
  })
})

tape('bearer auth with default sendImmediately', (t) => {
  // If we don't set sendImmediately = false, request will send bearer auth
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: 'theToken'
    }
  }, (error, res, body) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 3)
    t.end()
  })
})

tape('', (t) => {
  request({
    method: 'POST',
    form: { data_key: 'data_value' },
    uri: bearerServer.url + '/post/',
    auth: {
      bearer: 'theToken',
      sendImmediately: false
    }
  }, (error, res, body) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 5)
    t.end()
  })
})

tape('using .auth, sendImmediately = false', (t) => {
  request
    .get(bearerServer.url + '/test/')
    .auth(null, null, false, 'theToken')
    .on('response', (res) => {
      t.equal(res.statusCode, 200)
      t.equal(numBearerRequests, 7)
      t.end()
    })
})

tape('using .auth, sendImmediately = true', (t) => {
  request
    .get(bearerServer.url + '/test/')
    .auth(null, null, true, 'theToken')
    .on('response', (res) => {
      t.equal(res.statusCode, 200)
      t.equal(numBearerRequests, 8)
      t.end()
    })
})

tape('bearer is a function', (t) => {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test/',
    auth: {
      bearer: () => { return 'theToken' },
      sendImmediately: false
    }
  }, (error, res, body) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 10)
    t.end()
  })
})

tape('bearer is a function, path = test2', (t) => {
  // If we don't set sendImmediately = false, request will send bearer auth
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: () => { return 'theToken' }
    }
  }, (error, res, body) => {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 11)
    t.end()
  })
})

tape('no auth method', (t) => {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: undefined
    }
  }, (error, res, body) => {
    t.equal(error.message, 'no auth mechanism defined')
    t.end()
  })
})

tape('null bearer', (t) => {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: null
    }
  }, (error, res, body) => {
    t.error(error)
    t.equal(res.statusCode, 401)
    t.equal(numBearerRequests, 13)
    t.end()
  })
})

tape('cleanup', (t) => {
  bearerServer.close(() => {
    t.end()
  })
})
