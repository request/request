'use strict'

var assert = require('assert')
  , http = require('http')
  , request = require('../index')
  , tape = require('tape')

var numBasicRequests = 0
  , basicServer
  , port = 6767

tape('setup', function(t) {
  basicServer = http.createServer(function (req, res) {
    numBasicRequests++

    var ok

    if (req.headers.authorization) {
      if (req.headers.authorization === 'Basic ' + new Buffer('test:testing2').toString('base64')) {
        ok = true
      } else if ( req.headers.authorization === 'Basic ' + new Buffer('test:').toString('base64')) {
        ok = true
      } else if ( req.headers.authorization === 'Basic ' + new Buffer(':apassword').toString('base64')) {
        ok = true
      } else if ( req.headers.authorization === 'Basic ' + new Buffer('justauser').toString('base64')) {
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
      var expectedContent = 'data_key=data_value'
      req.on('data', function(data) {
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
  }).listen(port, function() {
    t.end()
  })
})

tape('', function(t) {
  request({
    'method': 'GET',
    'uri': 'http://localhost:6767/test/',
    'auth': {
      'user': 'test',
      'pass': 'testing2',
      'sendImmediately': false
    }
  }, function(error, res, body) {
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 2)
    t.end()
  })
})

tape('', function(t) {
  // If we don't set sendImmediately = false, request will send basic auth
  request({
    'method': 'GET',
    'uri': 'http://localhost:6767/test2/',
    'auth': {
      'user': 'test',
      'pass': 'testing2'
    }
  }, function(error, res, body) {
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 3)
    t.end()
  })
})

tape('', function(t) {
  request({
    'method': 'GET',
    'uri': 'http://test:testing2@localhost:6767/test2/'
  }, function(error, res, body) {
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 4)
    t.end()
  })
})

tape('', function(t) {
  request({
    'method': 'POST',
    'form': { 'data_key': 'data_value' },
    'uri': 'http://localhost:6767/post/',
    'auth': {
      'user': 'test',
      'pass': 'testing2',
      'sendImmediately': false
    }
  }, function(error, res, body) {
    t.equal(res.statusCode, 200)
    t.equal(numBasicRequests, 6)
    t.end()
  })
})

tape('', function(t) {
  t.doesNotThrow( function() {
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/allow_empty_user/',
      'auth': {
        'user': '',
        'pass': 'apassword',
        'sendImmediately': false
      }
    }, function(error, res, body ) {
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 8)
      t.end()
    })
  })
})

tape('', function(t) {
  t.doesNotThrow( function() {
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/allow_undefined_password/',
      'auth': {
        'user': 'justauser',
        'pass': undefined,
        'sendImmediately': false
      }
    }, function(error, res, body ) {
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 10)
      t.end()
    })
  })
})

tape('', function(t) {
  request
    .get('http://localhost:6767/test/')
    .auth('test','',false)
    .on('response', function (res) {
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 12)
      t.end()
    })
})

tape('', function(t) {
  request.get('http://localhost:6767/test/',
    {
      auth: {
        user: 'test',
        pass: '',
        sendImmediately: false
      }
    }, function (err, res) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(numBasicRequests, 14)
      t.end()
    })
})

tape('cleanup', function(t) {
  basicServer.close()
  t.end()
})
