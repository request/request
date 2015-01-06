'use strict'

var request = require('../index')
  , http = require('http')
  , zlib = require('zlib')
  , assert = require('assert')
  , tape = require('tape')

var testContent = 'Compressible response content.\n'
  , testContentGzip

var server = http.createServer(function(req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')

  if (/\bgzip\b/i.test(req.headers['accept-encoding'])) {
    res.setHeader('Content-Encoding', 'gzip')
    if (req.url === '/error') {
      // send plaintext instead of gzip (should cause an error for the client)
      res.end(testContent)
    } else {
      zlib.gzip(testContent, function(err, data) {
        assert.equal(err, null)
        res.end(data)
      })
    }
  } else {
    res.end(testContent)
  }
})

tape('setup', function(t) {
  zlib.gzip(testContent, function(err, data) {
    t.equal(err, null)
    testContentGzip = data
    server.listen(6767, function() {
      t.end()
    })
  })
})

tape('transparently supports gzip decoding to callbacks', function(t) {
  var options = { url: 'http://localhost:6767/foo', gzip: true }
  request.get(options, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'gzip')
    t.equal(body, testContent)
    t.end()
  })
})

tape('transparently supports gzip decoding to pipes', function(t) {
  var options = { url: 'http://localhost:6767/foo', gzip: true }
  var chunks = []
  request.get(options)
    .on('data', function(chunk) {
      chunks.push(chunk)
    })
    .on('end', function() {
      t.equal(Buffer.concat(chunks).toString(), testContent)
      t.end()
    })
    .on('error', function(err) {
      t.fail(err)
    })
})

tape('does not request gzip if user specifies Accepted-Encodings', function(t) {
  var headers = { 'Accept-Encoding': null }
  var options = {
    url: 'http://localhost:6767/foo',
    headers: headers,
    gzip: true
  }
  request.get(options, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], undefined)
    t.equal(body, testContent)
    t.end()
  })
})

tape('does not decode user-requested encoding by default', function(t) {
  var headers = { 'Accept-Encoding': 'gzip' }
  var options = { url: 'http://localhost:6767/foo', headers: headers }
  request.get(options, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'gzip')
    t.equal(body, testContentGzip.toString())
    t.end()
  })
})

tape('supports character encoding with gzip encoding', function(t) {
  var headers = { 'Accept-Encoding': 'gzip' }
  var options = {
    url: 'http://localhost:6767/foo',
    headers: headers,
    gzip: true,
    encoding: 'utf8'
  }
  var strings = []
  request.get(options)
    .on('data', function(string) {
      t.equal(typeof string, 'string')
      strings.push(string)
    })
    .on('end', function() {
      t.equal(strings.join(''), testContent)
      t.end()
    })
    .on('error', function(err) {
      t.fail(err)
    })
})

tape('transparently supports gzip error to callbacks', function(t) {
  var options = { url: 'http://localhost:6767/error', gzip: true }
  request.get(options, function(err, res, body) {
    t.equal(err.code, 'Z_DATA_ERROR')
    t.equal(res, undefined)
    t.equal(body, undefined)
    t.end()
  })
})

tape('transparently supports gzip error to pipes', function(t) {
  var options = { url: 'http://localhost:6767/error', gzip: true }
  request.get(options)
    .on('data', function (/*chunk*/) {
      t.fail('Should not receive data event')
    })
    .on('end', function () {
      t.fail('Should not receive end event')
    })
    .on('error', function (err) {
      t.equal(err.code, 'Z_DATA_ERROR')
      t.end()
    })
})

tape('cleanup', function(t) {
  server.close(function() {
    t.end()
  })
})
