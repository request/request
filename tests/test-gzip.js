var assert = require('assert')
var http = require('http')
var zlib = require('zlib')
var request = require('../index')

var server = http.createServer(function(req, res) {
  var accept = req.headers['accept-encoding']
  assert.equal(accept, 'gzip,deflate')

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

  request.get({
    uri: 'http://localhost:8081/deflate',
    gzip: true
  } , function (err, res, body) {
    assert.equal(body, 'deflate');

    request.get({
      uri: 'http://localhost:8081/gzip',
      gzip: true
    }, function (err, res, body) {
      assert.equal(body, 'gzip');
      server.close()
    });
  })

});
