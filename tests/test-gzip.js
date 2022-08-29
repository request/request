'use strict'

const request = require('../index')
const http = require('http')
const zlib = require('zlib')
const assert = require('assert')
const bufferEqual = require('buffer-equal')
const tape = require('tape')

const testContent = 'Compressible response content.\n'
let testContentBig
let testContentBigGzip
let testContentGzip

const server = http.createServer(function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')

  if (req.method === 'HEAD') {
    res.setHeader('Content-Encoding', 'gzip')
    res.end()
    return
  }
  if (req.headers.code) {
    res.writeHead(req.headers.code, {
      'Content-Encoding': 'gzip',
      code: req.headers.code
    })
    res.end()
    return
  }

  if (/\bgzip\b/i.test(req.headers['accept-encoding'])) {
    res.setHeader('Content-Encoding', 'gzip')
    if (req.url === '/error') {
      // send plaintext instead of gzip (should cause an error for the client)
      res.end(testContent)
    } else if (req.url === '/chunks') {
      res.writeHead(200)
      res.write(testContentBigGzip.slice(0, 4096))
      setTimeout(function () { res.end(testContentBigGzip.slice(4096)) }, 10)
    } else if (req.url === '/just-slightly-truncated') {
      zlib.gzip(testContent, function (err, data) {
        assert.equal(err, null)
        // truncate the CRC checksum and size check at the end of the stream
        res.end(data.slice(0, data.length - 8))
      })
    } else {
      zlib.gzip(testContent, function (err, data) {
        assert.equal(err, null)
        res.end(data)
      })
    }
  } else if (/\bdeflate\b/i.test(req.headers['accept-encoding'])) {
    res.setHeader('Content-Encoding', 'deflate')
    zlib.deflate(testContent, function (err, data) {
      assert.equal(err, null)
      res.end(data)
    })
  } else {
    res.end(testContent)
  }
})

tape('setup', function (t) {
  // Need big compressed content to be large enough to chunk into gzip blocks.
  // Want it to be deterministic to ensure test is reliable.
  // Generate pseudo-random printable ASCII characters using MINSTD
  const a = 48271
  const m = 0x7FFFFFFF
  let x = 1
  testContentBig = Buffer.alloc(10240)
  for (let i = 0; i < testContentBig.length; ++i) {
    x = (a * x) & m
    // Printable ASCII range from 32-126, inclusive
    testContentBig[i] = (x % 95) + 32
  }

  zlib.gzip(testContent, function (err, data) {
    t.equal(err, null)
    testContentGzip = data

    zlib.gzip(testContentBig, function (err, data2) {
      t.equal(err, null)
      testContentBigGzip = data2

      server.listen(0, function () {
        server.url = 'http://localhost:' + this.address().port
        t.end()
      })
    })
  })
})

tape('transparently supports gzip decoding to callbacks', function (t) {
  const options = { url: server.url + '/foo', gzip: true }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'gzip')
    t.equal(body, testContent)
    t.end()
  })
})

tape('supports slightly invalid gzip content', function (t) {
  const options = { url: server.url + '/just-slightly-truncated', gzip: true }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'gzip')
    t.equal(body, testContent)
    t.end()
  })
})

tape('transparently supports gzip decoding to pipes', function (t) {
  const options = { url: server.url + '/foo', gzip: true }
  const chunks = []
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

tape('does not request gzip if user specifies Accepted-Encodings', function (t) {
  const headers = { 'Accept-Encoding': null }
  const options = {
    url: server.url + '/foo',
    headers: headers,
    gzip: true
  }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], undefined)
    t.equal(body, testContent)
    t.end()
  })
})

tape('does not decode user-requested encoding by default', function (t) {
  const headers = { 'Accept-Encoding': 'gzip' }
  const options = { url: server.url + '/foo', headers: headers }
  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'gzip')
    t.equal(body, testContentGzip.toString())
    t.end()
  })
})

tape('supports character encoding with gzip encoding', function (t) {
  const headers = { 'Accept-Encoding': 'gzip' }
  const options = {
    url: server.url + '/foo',
    headers: headers,
    gzip: true,
    encoding: 'utf8'
  }
  const strings = []
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

tape('transparently supports gzip error to callbacks', function (t) {
  const options = { url: server.url + '/error', gzip: true }
  request.get(options, function (err, res, body) {
    t.equal(err.code, 'Z_DATA_ERROR')
    t.equal(res, undefined)
    t.equal(body, undefined)
    t.end()
  })
})

tape('transparently supports gzip error to pipes', function (t) {
  const options = { url: server.url + '/error', gzip: true }
  request.get(options)
    .on('data', function (chunk) {
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

tape('pause when streaming from a gzip request object', function (t) {
  const chunks = []
  const options = { url: server.url + '/chunks', gzip: true }
  let paused = false
  request.get(options)
    .on('data', function (chunk) {
      const self = this

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

tape('pause before streaming from a gzip request object', function (t) {
  const options = { url: server.url + '/foo', gzip: true }
  const r = request.get(options)
  let paused = true
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

tape('transparently supports deflate decoding to callbacks', function (t) {
  const options = { url: server.url + '/foo', gzip: true, headers: { 'Accept-Encoding': 'deflate' } }

  request.get(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-encoding'], 'deflate')
    t.equal(body, testContent)
    t.end()
  })
})

tape('do not try to pipe HEAD request responses', function (t) {
  const options = { method: 'HEAD', url: server.url + '/foo', gzip: true }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '')
    t.end()
  })
})

tape('do not try to pipe responses with no body', function (t) {
  const options = { url: server.url + '/foo', gzip: true }

  // skip 105 on Node >= v10
  const statusCodes = process.version.split('.')[0].slice(1) >= 10
    ? [204, 304]
    : [105, 204, 304]

  ;(function next (index) {
    if (index === statusCodes.length) {
      t.end()
      return
    }
    options.headers = { code: statusCodes[index] }
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
