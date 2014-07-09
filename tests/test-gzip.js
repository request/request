var request = require('../index')
  , http = require('http')
  , assert = require('assert')
  , zlib = require('zlib')

if (!zlib.Gunzip.prototype.setEncoding) {
  try {
    require('stringstream')
  } catch (e) {
    console.error('stringstream must be installed to run this test.')
    console.error('skipping this test. please install stringstream and run again if you need to test this feature.')
    process.exit(0)
  }
}

var testContent = 'Compressible response content.\n'
  , testContentGzip

var server = http.createServer(function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')

  if (/\bgzip\b/i.test(req.headers['accept-encoding'])) {
    zlib.gzip(testContent, function (err, data) {
      assert.ifError(err)
      testContentGzip = data
      res.setHeader('Content-Encoding', 'gzip')
      res.end(data)
    })
  } else {
    res.end(testContent)
  }
})

server.listen(6767, function (err) {
  assert.ifError(err)

  var headers, options

  // Transparently supports gzip decoding to callbacks
  options = { url: 'http://localhost:6767/foo', gzip: true }
  request.get(options, function (err, res, body) {
    assert.ifError(err)
    assert.strictEqual(res.headers['content-encoding'], 'gzip')
    assert.strictEqual(body, testContent)
  })


  // Transparently supports gzip decoding to pipes
  options = { url: 'http://localhost:6767/foo', gzip: true }
  var chunks = []
  request.get(options)
    .on('data', function (chunk) { chunks.push(chunk) })
    .on('end', function () {
        assert.strictEqual(Buffer.concat(chunks).toString(), testContent)
      })
    .on('error', function (err) { assert.ifError(err) })


  // Does not request gzip if user specifies Accepted-Encodings
  headers = { 'Accept-Encoding': null }
  options = {
    url: 'http://localhost:6767/foo',
    headers: headers,
    gzip: true
  }
  request.get(options, function (err, res, body) {
    assert.ifError(err)
    assert.strictEqual(res.headers['content-encoding'], undefined)
    assert.strictEqual(body, testContent)
  })


  // Does not decode user-requested encoding by default
  headers = { 'Accept-Encoding': 'gzip' }
  options = { url: 'http://localhost:6767/foo', headers: headers }
  request.get(options, function (err, res, body) {
    assert.ifError(err)
    assert.strictEqual(res.headers['content-encoding'], 'gzip')
    assert.strictEqual(body, testContentGzip.toString())
  })


  // Supports character encoding with gzip encoding
  headers = { 'Accept-Encoding': 'gzip' }
  options = {
    url: 'http://localhost:6767/foo',
    headers: headers,
    gzip: true,
    encoding: "utf8"
  }
  var strings = []
  request.get(options)
    .on('data', function (string) {
        assert.strictEqual(typeof string, "string")
        strings.push(string)
      })
    .on('end', function () {
        assert.strictEqual(strings.join(""), testContent)

        // Shutdown server after last test
        server.close()
      })
    .on('error', function (err) { assert.ifError(err) })
})
