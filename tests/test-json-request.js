'use strict'

var server = require('./server')
  , stream = require('stream')
  , request = require('../index')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

tape('test testPutBoolean', function(t) {
  s.on('/testPutBoolean', server.createPostValidator('true', 'application/json'))
  var opts = {
    method: 'PUT',
    uri: s.url + '/testPutBoolean',
    json: true,
    body: true
  }
  request(opts, function (err, resp, body) {
    t.equal(err, null)
    t.end()
  })
})

tape('test testPutNull', function(t) {
  s.on('/testPutNull', server.createPostValidator(''))
  var opts = {
    method: 'PUT',
    uri: s.url + '/testPutNull',
    json: true,
    body: null
  }
  request(opts, function (err, resp, body) {
    t.equal(err, null)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
