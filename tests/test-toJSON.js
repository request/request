var request = require('../index')
  , http = require('http')
  , assert = require('assert')
  ;

var s = http.createServer(function (req, resp) {
  resp.statusCode = 200
  resp.end('asdf')
}).listen(8080, function () {
  var r = request({
    url: 'http://localhost:8080',
    headers: {foo: 'bar'}
  }, function (e, resp) {
    assert.equal(JSON.parse(JSON.stringify(r)).uri.href, r.uri.href)
    assert.equal(JSON.parse(JSON.stringify(r)).method, r.method)
    assert.equal(JSON.parse(JSON.stringify(r)).headers.foo, r.headers.foo)
    assert.equal(JSON.parse(JSON.stringify(resp)).statusCode, resp.statusCode)
    assert.equal(JSON.parse(JSON.stringify(resp)).body, resp.body)
    assert.equal(JSON.parse(JSON.stringify(resp)).headers.date, resp.headers.date)
    s.close()
  })
})