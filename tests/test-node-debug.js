var assert = require('assert')
  , request = require('../index')
  , http = require('http')
  ;

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('')
}).listen(6767, function () {
  // a simple request should not fail with NODE_DEBUG
  process.env.NODE_DEBUG = 'mumblemumble,request'

  request('http://localhost:6767', function (err, resp, body) {
    assert.ifError(err, 'the request did not fail')
    assert.ok(resp, 'the request did not fail')
    s.close(); // clean up
  })
})
