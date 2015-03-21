'use strict'

var request = require('../index')
  , tape = require('tape')

var local = 'http://localhost:8888/asdf'

tape('without uri', function(t) {
  t.throws(function() {
    request({})
  }, /^Error: options\.uri is a required argument$/)
  t.end()
})

tape('invalid uri 1', function(t) {
  t.throws(function() {
    request({
      uri: 'this-is-not-a-valid-uri'
    })
  }, /^Error: Invalid URI/)
  t.end()
})

tape('invalid uri 2', function(t) {
  t.throws(function() {
    request({
      uri: 'github.com/uri-is-not-valid-without-protocol'
    })
  }, /^Error: Invalid URI/)
  t.end()
})

tape('deprecated unix URL', function(t) {
  t.throws(function() {
    request({
      uri: 'unix://path/to/socket/and/then/request/path'
    })
  }, /^Error: `unix:\/\/` URL scheme is no longer supported/)
  t.end()
})

tape('invalid body', function(t) {
  t.throws(function() {
    request({
      uri: local, body: {}
    })
  }, /^Error: Argument error, options\.body\.$/)
  t.end()
})

tape('invalid multipart', function(t) {
  t.throws(function() {
    request({
      uri: local,
      multipart: 'foo'
    })
  }, /^Error: Argument error, options\.multipart\.$/)
  t.end()
})

tape('multipart without body 1', function(t) {
  t.throws(function() {
    request({
      uri: local,
      multipart: [ {} ]
    })
  }, /^Error: Body attribute missing in multipart\.$/)
  t.end()
})

tape('multipart without body 2', function(t) {
  t.throws(function() {
    request(local, {
      multipart: [ {} ]
    })
  }, /^Error: Body attribute missing in multipart\.$/)
  t.end()
})

tape('head method with a body', function(t) {
  t.throws(function() {
    request(local, {
      method: 'HEAD',
      body: 'foo'
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)
  t.end()
})

tape('head method with a body 2', function(t) {
  t.throws(function() {
    request.head(local, {
      body: 'foo'
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)
  t.end()
})
