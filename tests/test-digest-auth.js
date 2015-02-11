'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')

function makeHeader() {
  return [].join.call(arguments, ', ')
}

function makeHeaderRegex() {
  return new RegExp('^' + makeHeader.apply(null, arguments) + '$')
}

var digestServer = http.createServer(function(req, res) {
  var ok
    , testHeader

  if (req.url === '/test/') {
    if (req.headers.authorization) {
      testHeader = makeHeaderRegex(
        'Digest username="test"',
        'realm="Private"',
        'nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93"',
        'uri="/test/"',
        'qop=auth',
        'response="[a-f0-9]{32}"',
        'nc=00000001',
        'cnonce="[a-f0-9]{32}"',
        'algorithm=MD5',
        'opaque="5ccc069c403ebaf9f0171e9517f40e41"'
      )
      if (testHeader.test(req.headers.authorization)) {
        ok = true
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false
      res.setHeader('www-authenticate', makeHeader(
        'Digest realm="Private"',
        'nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93"',
        'algorithm=MD5',
        'qop="auth"',
        'opaque="5ccc069c403ebaf9f0171e9517f40e41"'
      ))
    }
  } else if (req.url === '/dir/index.html') {
    // RFC2069-compatible mode
    // check: http://www.rfc-editor.org/errata_search.php?rfc=2069
    if (req.headers.authorization) {
      testHeader = makeHeaderRegex(
        'Digest username="Mufasa"',
        'realm="testrealm@host.com"',
        'nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093"',
        'uri="/dir/index.html"',
        'response="[a-f0-9]{32}"',
        'opaque="5ccc069c403ebaf9f0171e9517f40e41"'
      )
      if (testHeader.test(req.headers.authorization)) {
        ok = true
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false
      res.setHeader('www-authenticate', makeHeader(
        'Digest realm="testrealm@host.com"',
        'nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093"',
        'opaque="5ccc069c403ebaf9f0171e9517f40e41"'
      ))
    }
  }

  if (ok) {
    res.end('ok')
  } else {
    res.statusCode = 401
    res.end('401')
  }
})

tape('setup', function(t) {
  digestServer.listen(6767, function() {
    t.end()
  })
})

tape('with sendImmediately = false', function(t) {
  var numRedirects = 0

  request({
    method: 'GET',
    uri: 'http://localhost:6767/test/',
    auth: {
      user: 'test',
      pass: 'testing',
      sendImmediately: false
    }
  }, function(error, response, body) {
    t.equal(error, null)
    t.equal(response.statusCode, 200)
    t.equal(numRedirects, 1)
    t.end()
  }).on('redirect', function() {
    t.equal(this.response.statusCode, 401)
    numRedirects++
  })
})

tape('without sendImmediately = false', function(t) {
  var numRedirects = 0

  // If we don't set sendImmediately = false, request will send basic auth
  request({
    method: 'GET',
    uri: 'http://localhost:6767/test/',
    auth: {
      user: 'test',
      pass: 'testing'
    }
  }, function(error, response, body) {
    t.equal(error, null)
    t.equal(response.statusCode, 401)
    t.equal(numRedirects, 0)
    t.end()
  }).on('redirect', function() {
    t.equal(this.response.statusCode, 401)
    numRedirects++
  })
})

tape('with different credentials', function(t) {
  var numRedirects = 0

  request({
    method: 'GET',
    uri: 'http://localhost:6767/dir/index.html',
    auth: {
      user: 'Mufasa',
      pass: 'CircleOfLife',
      sendImmediately: false
    }
  }, function(error, response, body) {
    t.equal(error, null)
    t.equal(response.statusCode, 200)
    t.equal(numRedirects, 1)
    t.end()
  }).on('redirect', function() {
    t.equal(this.response.statusCode, 401)
    numRedirects++
  })
})

tape('cleanup', function(t) {
  digestServer.close(function() {
    t.end()
  })
})
