var assert = require('assert')
var http = require('http')
var zlib = require('zlib')
var request = require('../index')

var server = http.createServer(function(req, res) {
  if (req.url === '/deflate') {
    res.writeHead(200, {'content-encoding': 'deflate'})
    zlib.deflate('deflate', function(err, content) {
      res.end(content)
    })
  } else if (req.url === '/gzip') {
    res.writeHead(200, {'content-encoding': 'gzip'})
    zlib.gzip('gzip', function(err, content) {
      res.end(content)
    })
  } else {
    res.writeHead(200)
    res.end('none')
  }
})


server.listen(8081, function() {

  request.get('http://localhost:8081/deflate', function (err, res, body) {
    console.log(body)
    assert.equal(body, 'deflate');

    request.get('http://localhost:8081/gzip', function (err, res, body) {
      console.log(body)
      assert.equal(body, 'gzip');
      server.close()
    });
  })

});
