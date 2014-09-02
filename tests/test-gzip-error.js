var request = require('../index')
  , http = require('http')
  , assert = require('assert')
  , zlib = require('zlib')

var testContent = 'Compressible response content.\n';

var server = http.createServer(function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Content-Encoding', 'gzip')
  // send plaintext instead of gzip (should cause an error for the client)
  res.end(testContent)
})

server.listen(6767, function (err) {
  assert.ifError(err)

  var headers, options

  // Transparently supports gzip error to callbacks
  options = { url: 'http://localhost:6767/foo', gzip: true }
  request.get(options, function (err, res, body) {  
    assert.equal(err.code,'Z_DATA_ERROR')
    assert.strictEqual(res, undefined)
    assert.strictEqual(body, undefined)
  })

  // Transparently supports gzip error to pipes
  options = { url: 'http://localhost:6767/foo', gzip: true }
  var chunks = []
  request.get(options)
    .on('data', function (chunk) {
      throw 'Should not receive data event'
    })
    .on('end', function () {
      throw 'Should not receive end event'
    })
    .on('error', function (err) {
      assert.equal(err.code,'Z_DATA_ERROR')
      server.close()
    })
})
