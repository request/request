'use strict'

var request = require('../index')
  , tape = require('tape')

tape('bind to invalid address', function(t) {
  request.get({
    uri: 'http://www.google.com',
    localAddress: '1.2.3.4'
  }, function(err, res) {
    t.notEqual(err, null)
    t.equal(err.message, 'bind EADDRNOTAVAIL')
    t.equal(res, undefined)
    t.end()
  })
})

tape('bind to local address', function(t) {
  request.get({
    uri: 'http://www.google.com',
    localAddress: '127.0.0.1'
  }, function(err, res) {
    t.notEqual(err, null)
    t.equal(res, undefined)
    t.end()
  })
})
