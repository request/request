var http = require('http')
  , request = require('../index')
  , tape = require('tape')

var s = http.createServer(function(req, res) {
  res.statusCode = 200
  res.end('ok')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('lowercase', function(t) {
  request('http://localhost:6767', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('uppercase', function(t) {
  request('HTTP://localhost:6767', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('mixedcase', function(t) {
  request('HtTp://localhost:6767', function(err, resp, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port', function(t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: 6767
    }
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port', function(t) {
  request({
    uri: {
      protocol: 'http:',
      hostname: 'localhost',
      port: 6767
    }
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
