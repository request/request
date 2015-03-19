'use strict'

var server = require('./server')
  , request = require('../index')
  , tape = require('tape')

var plain_server = server.createServer()
  , redirect_mock_time = 10

tape('setup', function(t) {
  plain_server.listen(plain_server.port, function() {
    plain_server.on('/', function (req, res) {
      res.writeHead(200)
      res.end('plain')
    })
    plain_server.on('/redir', function (req, res) {
      // fake redirect delay to ensure strong signal for rollup check
      setTimeout(function() {
        res.writeHead(301, { 'location': 'http://localhost:' + plain_server.port + '/' })
        res.end()
      }, redirect_mock_time)
    })

    t.end()
  })
})

tape('non-redirected request is timed', function(t) {
  var options = {time: true}
  request('http://localhost:' + plain_server.port + '/', options, function(err, res, body) {
    t.equal(err, null)
    t.equal(typeof res.elapsedTime, 'number')
    t.equal((res.elapsedTime > 0), true)
    t.end()
  })
})

tape('redirected request is timed with rollup', function(t) {
  var options = {time: true}
  request('http://localhost:' + plain_server.port + '/redir', options, function(err, res, body) {
    t.equal(err, null)
    t.equal(typeof res.elapsedTime, 'number')
    t.equal((res.elapsedTime > 0), true)
    t.equal((res.elapsedTime > redirect_mock_time), true)
    t.end()
  })
})

tape('cleanup', function(t) {
  plain_server.close(function() {
    t.end()
  })
})
