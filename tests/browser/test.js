'use strict'

if (!Function.prototype.bind) {
  /*eslint no-extend-native:0*/
  Function.prototype.bind = require('function-bind')
}


var assert = require('assert')
  , tape = require('tape')
  , request = require('../../index')

tape('Request browser test', function(t) {
  t.plan(1)
  request({
    uri: 'https://api.github.com',
    withCredentials: false
  }, function (error, response) {
    t.equal(response.statusCode, 200)
    t.end()
  })
})
