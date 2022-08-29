'use strict'

const assert = require('assert')
const http = require('http')
const request = require('../index')
const tape = require('tape')

let numBearerRequests = 0
let bearerServer

tape('setup', function (t) {
  bearerServer = http.createServer(function (req, res) {
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
      req.on('data', function (data) {
        assert.equal(data, expectedContent)
      })
      assert.equal(req.method, 'POST')
      assert.equal(req.headers['content-length'], '' + expectedContent.length)
      assert.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
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

tape('bearer auth', function (t) {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test/',
    auth: {
      bearer: 'theToken',
      sendImmediately: false
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 2)
    t.end()
  })
})

tape('bearer auth with default sendImmediately', function (t) {
  // If we don't set sendImmediately = false, request will send bearer auth
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: 'theToken'
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 3)
    t.end()
  })
})

tape('', function (t) {
  request({
    method: 'POST',
    form: { data_key: 'data_value' },
    uri: bearerServer.url + '/post/',
    auth: {
      bearer: 'theToken',
      sendImmediately: false
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 5)
    t.end()
  })
})

tape('using .auth, sendImmediately = false', function (t) {
  request
    .get(bearerServer.url + '/test/')
    .auth(null, null, false, 'theToken')
    .on('response', function (res) {
      t.equal(res.statusCode, 200)
      t.equal(numBearerRequests, 7)
      t.end()
    })
})

tape('using .auth, sendImmediately = true', function (t) {
  request
    .get(bearerServer.url + '/test/')
    .auth(null, null, true, 'theToken')
    .on('response', function (res) {
      t.equal(res.statusCode, 200)
      t.equal(numBearerRequests, 8)
      t.end()
    })
})

tape('bearer is a function', function (t) {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test/',
    auth: {
      bearer: function () { return 'theToken' },
      sendImmediately: false
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 10)
    t.end()
  })
})

tape('bearer is a function, path = test2', function (t) {
  // If we don't set sendImmediately = false, request will send bearer auth
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: function () { return 'theToken' }
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(res.statusCode, 200)
    t.equal(numBearerRequests, 11)
    t.end()
  })
})

tape('no auth method', function (t) {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: undefined
    }
  }, function (error, res, body) {
    t.equal(error.message, 'no auth mechanism defined')
    t.end()
  })
})

tape('null bearer', function (t) {
  request({
    method: 'GET',
    uri: bearerServer.url + '/test2/',
    auth: {
      bearer: null
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(res.statusCode, 401)
    t.equal(numBearerRequests, 13)
    t.end()
  })
})

tape('cleanup', function (t) {
  bearerServer.close(function () {
    t.end()
  })
})
