var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , fs = require('fs')
  , request = require('../index')
  , path = require('path')
  , util = require('util')
  ;

var port = 6768
  , called = false
  , proxiedHost = 'google.com'
  ;

// set up environment variable
process.env.NO_PROXY = '*';
  
var s = server.createServer(port)
s.listen(port, function () {
  s.on('http://google.com/', function (req, res) {
    called = true
    assert.equal(req.headers.host, proxiedHost)
    res.writeHeader(200)
    res.end()
  })
  request ({
    url: 'http://'+proxiedHost,
    proxy: 'http://localhost:'+port
    /* NO_PROXY should be ignored, because we've explicitly
       passed a proxy.
    */
  }, function (err, res, body) {
    s.close()
  })
})

process.on('exit', function () {
  assert.ok(called, 'the request must be made to the proxy server')
})
