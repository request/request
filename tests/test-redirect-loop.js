var request = require('../index')
  , http = require('http')
  , assert = require('assert')
  ;

var server = http.createServer(function (req, res) {
  res.statusCode = 304
  res.setHeader('Location', req.url)
  res.end()
}).listen(8080, function () {
  request('http://localhost:8080/test', function (e, res, body) {
    assert.equal(res.statusCode, 304)
    assert.equal(body, '')

    server.close()
  })
})
