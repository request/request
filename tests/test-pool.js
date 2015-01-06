'use strict'

var request = require('../index')
  , http = require('http')
  , tape = require('tape')

var s = http.createServer(function (req, res) {
  res.statusCode = 200
  res.end('asdf')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('pool', function(t) {
  request({
    url: 'http://localhost:6767',
    pool: false
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'asdf')

    var agent = res.request.agent
    t.equal(agent, false)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
