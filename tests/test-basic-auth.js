'use strict'

var assert = require('assert')
var http = require('http')
var request = require('../index')
var tape = require('tape')

var numBasicRequests = 0
var basicServer

tape('setup', function (t) {
  basicServer = http.createServer(function (req, res) {
    numBasicRequests++

    var ok

    if (req.headers.authorization) {
      if (req.headers.authorization === 'Basic ' + Buffer.from('user:pass').toString('base64')) {
        ok = true
      } else if (req.headers.authorization === 'Basic ' + Buffer.from('user:').toString('base64')) {
        ok = true
      } else if (req.headers.authorization === 'Basic ' + Buffer.from(':pass').toString('base64')) {
        ok = true
      } else if (req.headers.authorization === 'Basic ' + Buffer.from('user:pâss').toString('base64')) {
        ok = true
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false
      res.setHeader('www-authenticate', 'Basic realm="Private"')
    }

    if (req.url === '/post/') {
      var expectedContent = 'key=value'
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
    basicServer.port = this.address().port
    basicServer.url = 'http://localhost:' + basicServer.port
    t.end()
  })
})

tape('sendImmediately - false', function (t) {
  var r = request({
    'method': 'GET',
    'uri': basicServer.url + '/test/',
    'auth': {
      'user': 'user',
      'pass': 'pass',
      'sendImmediately': false
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(r._auth.user, 'user')
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 2)
    t.end()
  })
})

tape('sendImmediately - true', function (t) {
  // If we don't set sendImmediately = false, request will send basic auth
  var r = request({
    'method': 'GET',
    'uri': basicServer.url + '/test2/',
    'auth': {
      'user': 'user',
      'pass': 'pass'
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(r._auth.user, 'user')
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 3)
    t.end()
  })
})

tape('credentials in url', function (t) {
  var r = request({
    'method': 'GET',
    'uri': basicServer.url.replace(/:\/\//, '$&user:pass@') + '/test2/'
  }, function (error, res, body) {
    t.error(error)
    t.equal(r._auth.user, 'user')
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 4)
    t.end()
  })
})

tape('POST request', function (t) {
  var r = request({
    'method': 'POST',
    'form': { 'key': 'value' },
    'uri': basicServer.url + '/post/',
    'auth': {
      'user': 'user',
      'pass': 'pass',
      'sendImmediately': false
    }
  }, function (error, res, body) {
    t.error(error)
    t.equal(r._auth.user, 'user')
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 6)
    t.end()
  })
})

tape('user - empty string', function (t) {
  t.doesNotThrow(function () {
    var r = request({
      'method': 'GET',
      'uri': basicServer.url + '/allow_empty_user/',
      'auth': {
        'user': '',
        'pass': 'pass',
        'sendImmediately': false
      }
    }, function (error, res, body) {
      t.error(error)
      t.equal(r._auth.user, '')
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 8)
      t.end()
    })
  })
})

tape('pass - undefined', function (t) {
  t.doesNotThrow(function () {
    var r = request({
      'method': 'GET',
      'uri': basicServer.url + '/allow_undefined_password/',
      'auth': {
        'user': 'user',
        'pass': undefined,
        'sendImmediately': false
      }
    }, function (error, res, body) {
      t.error(error)
      t.equal(r._auth.user, 'user')
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 10)
      t.end()
    })
  })
})

tape('pass - utf8', function (t) {
  t.doesNotThrow(function () {
    var r = request({
      'method': 'GET',
      'uri': basicServer.url + '/allow_undefined_password/',
      'auth': {
        'user': 'user',
        'pass': 'pâss',
        'sendImmediately': false
      }
    }, function (error, res, body) {
      t.error(error)
      t.equal(r._auth.user, 'user')
      t.equal(r._auth.pass, 'pâss')
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 12)
      t.end()
    })
  })
})

tape('auth method', function (t) {
  var r = request
    .get(basicServer.url + '/test/')
    .auth('user', '', false)
    .on('response', function (res) {
      t.equal(r._auth.user, 'user')
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 14)
      t.end()
    })
})

tape('get method', function (t) {
  var r = request.get(basicServer.url + '/test/',
    {
      auth: {
        user: 'user',
        pass: '',
        sendImmediately: false
      }
    }, function (err, res) {
      t.equal(r._auth.user, 'user')
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 16)
      t.end()
    })
})

tape('cleanup', function (t) {
  basicServer.close(function () {
    t.end()
  })
})
