'use strict'

var request = require('../index')
var http = require('http')
var bufferEqual = require('buffer-equal')
var tape = require('tape')
var Buffer = require('safe-buffer').Buffer
var brotliCompress = require('brotli/compress')

var testContent = 'compressible response content.\n'
var testContentBrotli = Buffer.from(brotliCompress(Buffer.from(testContent)))
var testContentBig
var testContentBigBrotli

var server = http.createServer(function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')

  if (req.method === 'HEAD') {
    res.setHeader('Content-Encoding', 'br')
    res.end()
    return
  }
  if (req.headers.code) {
    res.writeHead(req.headers.code, {
      'Content-Encoding': 'br',
      code: req.headers.code
    })
    res.end()
    return
  }

  if (/\bbr\b/i.test(req.headers['accept-encoding'])) {
    res.setHeader('Content-Encoding', 'br')
    if (req.url === '/error') {
      // send plaintext instead of br (should cause an error for the client)
      res.end(testContent)
    } else if (req.url === '/chunks') {
      res.writeHead(200)
      res.write(Buffer.from(testContentBigBrotli.slice(0, 4096)))
      setTimeout(function () { res.end(Buffer.from(testContentBigBrotli.slice(4096))) }, 10)
    } else {
      res.end(testContentBrotli)
    }
  } else {
    res.end(testContent)
  }
})

tape('setup', function (t) {
  // Need big compressed content to be large enough to chunk into brotli blocks.
  // Want it to be deterministic to ensure test is reliable.
  // Generate pseudo-random printable ASCII characters using MINSTD
  var a = 48271
  var m = 0x7FFFFFFF
  var x = 1
  testContentBig = Buffer.alloc(10240)
  for (var i = 0; i < testContentBig.length; ++i) {
    x = (a * x) & m
    // Printable ASCII range from 32-126, inclusive
    testContentBig[i] = (x % 95) + 32
  }

  testContentBigBrotli = brotliCompress(Buffer.from(testContentBig))

  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('transparently supports brotli decoding to callbacks', function (t) {
  var options = { url: server.url + '/foo', brotli: true }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'br')
    t.equal(body, testContent)
    t.end()
  })
})

tape('transparently supports brotli decoding to pipes', function (t) {
  var options = { url: server.url + '/foo', brotli: true }
  var chunks = []
  request.get(options)
    .on('data', function (chunk) {
      chunks.push(chunk)
    })
    .on('end', function () {
      t.equal(Buffer.concat(chunks).toString(), testContent)
      t.end()
    })
    .on('error', function (err) {
      t.fail(err)
    })
})

tape('does not request brotli if user specifies Accepted-Encodings', function (t) {
  var headers = { 'Accept-Encoding': null }
  var options = {
    url: server.url + '/foo',
    headers: headers,
    brotli: true
  }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], undefined)
    t.equal(body, testContent)
    t.end()
  })
})

tape('does not decode user-requested encoding by default', function (t) {
  var headers = { 'Accept-Encoding': 'br' }
  var options = { url: server.url + '/foo', headers: headers }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'br')
    t.equal(body, testContentBrotli.toString())
    t.end()
  })
})

tape('does not decode brotli encoding when "gzip" option is set', function (t) {
  var headers = { 'Accept-Encoding': 'br' }
  var options = { url: server.url + '/foo', headers: headers, gzip: true }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'br')
    t.equal(body, testContentBrotli.toString())
    t.end()
  })
})

tape('supports character encoding with brotli encoding', function (t) {
  var headers = { 'Accept-Encoding': 'br' }
  var options = {
    url: server.url + '/foo',
    headers: headers,
    brotli: true,
    encoding: 'utf8'
  }
  var strings = []
  request.get(options)
    .on('data', function (string) {
      t.equal(typeof string, 'string')
      strings.push(string)
    })
    .on('end', function () {
      t.equal(strings.join(''), testContent)
      t.end()
    })
    .on('error', function (err) {
      t.fail(err)
    })
})

tape('transparently supports brotli error to callbacks', function (t) {
  var options = { url: server.url + '/error', brotli: true }
  request.get(options, function (err, res, body) {
    t.equal(err.code, 'ERR_PADDING_1')
    t.equal(res, undefined)
    t.equal(body, undefined)
    t.end()
  })
})

tape('transparently supports brotli error to pipes', function (t) {
  var options = { url: server.url + '/error', brotli: true }
  request.get(options)
    .on('data', function (chunk) {
      t.fail('Should not receive data event')
    })
    .on('end', function () {
      t.fail('Should not receive end event')
    })
    .on('error', function (err) {
      t.equal(err.code, 'ERR_PADDING_1')
      t.end()
    })
})

tape('pause when streaming from a brotli request object', function (t) {
  var chunks = []
  var paused = false
  var options = { url: server.url + '/chunks', brotli: true }
  request.get(options)
    .on('data', function (chunk) {
      var self = this

      t.notOk(paused, 'Only receive data when not paused')

      chunks.push(chunk)
      if (chunks.length === 1) {
        self.pause()
        paused = true
        setTimeout(function () {
          paused = false
          self.resume()
        }, 100)
      }
    })
    .on('end', function () {
      t.ok(chunks.length > 1, 'Received multiple chunks')
      t.ok(bufferEqual(Buffer.concat(chunks), testContentBig), 'Expected content')
      t.end()
    })
})

tape('pause before streaming from a brotli request object', function (t) {
  var paused = true
  var options = { url: server.url + '/foo', brotli: true }
  var r = request.get(options)
  r.pause()
  r.on('data', function (data) {
    t.notOk(paused, 'Only receive data when not paused')
    t.equal(data.toString(), testContent)
  })
  r.on('end', t.end.bind(t))

  setTimeout(function () {
    paused = false
    r.resume()
  }, 100)
})

tape('do not try to pipe HEAD request responses', function (t) {
  var options = { method: 'HEAD', url: server.url + '/foo', brotli: true }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '')
    t.end()
  })
})

tape('do not try to pipe responses with no body', function (t) {
  var options = { url: server.url + '/foo', brotli: true }

  // skip 105 on Node >= v10
  var statusCodes = process.version.split('.')[0].slice(1) >= 10
    ? [204, 304] : [105, 204, 304]

  ;(function next (index) {
    if (index === statusCodes.length) {
      t.end()
      return
    }
    options.headers = {code: statusCodes[index]}
    request.post(options, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.headers.code, statusCodes[index].toString())
      t.equal(body, '')
      next(++index)
    })
  })(0)
})

tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})
