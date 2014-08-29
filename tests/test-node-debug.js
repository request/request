var assert = require('assert')
  , request = require('../index')
  , http = require('http')
  ;

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('')
}).listen(6767, function () {
  // a simple request should not fail with debugging enabled
  request.debug = true

  var stderr = []
    , stderrLen = 0
  process.stderr.write = (function(write) {
    return function(string, encoding, fd) {
      stderr.push(string)
    }
  })(process.stderr.write)

  request('http://localhost:6767', function (err, resp, body) {
    assert.ifError(err, 'the request did not fail')
    assert.ok(resp, 'the request did not fail')

    assert.ok(stderr.length, 'stderr has some messages')
    ;[
      /^REQUEST { uri: /,
      /^REQUEST make request http:\/\/localhost:6767\/\n$/,
      /^REQUEST onResponse /,
      /^REQUEST finish init /,
      /^REQUEST response end /,
      /^REQUEST end event /,
      /^REQUEST emitting complete /
    ].forEach(function(t) {
      var found = false
      stderr.forEach(function(msg) {
        if (t.test(msg)) found = true
      })
      assert.ok(found, 'a log message matches ' + t)
    })
    stderrLen = stderr.length

    // there should be no further lookups on process.env
    process.env.NODE_DEBUG = ''
    stderr = []

    request('http://localhost:6767', function(err, resp, body) {
      assert.ifError(err, 'the request did not fail')
      assert.ok(resp, 'the request did not fail')

      assert.equal(stderr.length, stderrLen, 'env.NODE_DEBUG is not retested')

      // it should be possible to disable debugging at runtime
      request.debug = false
      stderr = []

      request('http://localhost:6767', function(err, resp, body) {
        assert.ifError(err, 'the request did not fail')
        assert.ok(resp, 'the request did not fail')

        assert.equal(stderr.length, 0, 'debugging can be disabled')

        s.close(); // clean up
      })
    })
  })
})
