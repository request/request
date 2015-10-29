'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')
  , Promise = require('bluebird')

var s = http.createServer(function(req, res) {
  res.writeHead(200, {})
  res.end('ok')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('promisify convenience method', function(t) {
  var get = request.get
  var p = Promise.promisify(get, {multiArgs: true})
  p('http://localhost:6767')
    .then(function (results) {
      var res = results[0]
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('promisify request function', function(t) {
  var p = Promise.promisify(request, {multiArgs: true})
  p('http://localhost:6767')
    .spread(function (res, body) {
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('promisify all methods', function(t) {
  Promise.promisifyAll(request, {multiArgs: true})
  request.getAsync('http://localhost:6767')
    .spread(function (res, body) {
      t.equal(res.statusCode, 200)
      t.end()
    })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
