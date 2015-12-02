'use strict'

var fs = require('fs')
  , http = require('http')
  , path = require('path')
  , https = require('https')
  , stream = require('stream')
  , assert = require('assert')

exports.port = 6767
exports.portSSL = 16167

exports.createServer = function (port) {
  port = port || exports.port
  var s = http.createServer(function (req, resp) {
    s.emit(req.url.replace(/(\?.*)/, ''), req, resp)
  })
  s.port = port
  s.url = 'http://localhost:' + port
  s.protocol = 'http'
  return s
}

exports.createEchoServer = function (port) {
  port = port || exports.port
  var s = http.createServer(function (req, resp) {
    var b = ''
    req.on('data', function (chunk) {b += chunk})
    req.on('end', function () {
      resp.writeHead(200, {'content-type':'application/json'})
      resp.write(JSON.stringify({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: b
      }))
      resp.end()
    })
  })
  s.port = port
  s.url = 'http://localhost:' + port
  s.protocol = 'http'
  return s
}

exports.createSSLServer = function(port, opts) {
  port = port || exports.portSSL

  var i
    , options = { 'key' : path.join(__dirname, 'ssl', 'test.key')
                , 'cert': path.join(__dirname, 'ssl', 'test.crt')
                }
  if (opts) {
    for (i in opts) {
      options[i] = opts[i]
    }
  }

  for (i in options) {
    if (i !== 'requestCert' && i !== 'rejectUnauthorized' && i !== 'ciphers') {
      options[i] = fs.readFileSync(options[i])
    }
  }

  var s = https.createServer(options, function (req, resp) {
    s.emit(req.url, req, resp)
  })
  s.port = port
  s.url = 'https://localhost:' + port
  s.protocol = 'https'
  return s
}

exports.createPostStream = function (text) {
  var postStream = new stream.Stream()
  postStream.writeable = true
  postStream.readable = true
  setTimeout(function() {
    postStream.emit('data', new Buffer(text))
    postStream.emit('end')
  }, 0)
  return postStream
}
exports.createPostValidator = function (text, reqContentType) {
  var l = function (req, resp) {
    var r = ''
    req.on('data', function (chunk) {r += chunk})
    req.on('end', function () {
      if (req.headers['content-type'] && req.headers['content-type'].indexOf('boundary=') >= 0) {
        var boundary = req.headers['content-type'].split('boundary=')[1]
        text = text.replace(/__BOUNDARY__/g, boundary)
      }
      assert.equal(r, text)
      if (reqContentType) {
        assert.ok(req.headers['content-type'])
        assert.ok(~req.headers['content-type'].indexOf(reqContentType))
      }
      resp.writeHead(200, {'content-type':'text/plain'})
      resp.write(r)
      resp.end()
    })
  }
  return l
}
exports.createPostJSONValidator = function (value, reqContentType) {
  var l = function (req, resp) {
    var r = ''
    req.on('data', function (chunk) {r += chunk})
    req.on('end', function () {
      var parsedValue = JSON.parse(r)
      assert.deepEqual(parsedValue, value)
      if (reqContentType) {
        assert.ok(req.headers['content-type'])
        assert.ok(~req.headers['content-type'].indexOf(reqContentType))
      }
      resp.writeHead(200, {'content-type':'application/json'})
      resp.write(r)
      resp.end()
    })
  }
  return l
}
exports.createGetResponse = function (text, contentType) {
  var l = function (req, resp) {
    contentType = contentType || 'text/plain'
    resp.writeHead(200, {'content-type':contentType})
    resp.write(text)
    resp.end()
  }
  return l
}
exports.createChunkResponse = function (chunks, contentType) {
  var l = function (req, resp) {
    contentType = contentType || 'text/plain'
    resp.writeHead(200, {'content-type':contentType})
    chunks.forEach(function (chunk) {
      resp.write(chunk)
    })
    resp.end()
  }
  return l
}
