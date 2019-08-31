'use strict'

var assert = require('assert')
var filterForNonReserved = require('../lib/helpers').filterForNonReserved
var tape = require('tape')

tape('setup', function (t) {
  var obj = {}
  obj.__proto__.hostname = 'evil.com' // eslint-disable-line no-proto
  t.end()
})

tape('do not create a polluted object when filtering reserved options', function (t) {
  var options = Object.create(null)
  assert.equal(options.hostname, undefined)

  var filtered = filterForNonReserved([], options)
  assert.equal(filtered.hostname, undefined)

  t.end()
})

tape('cleanup', function (t) {
  var obj = {}
  obj.__proto__.hostname = undefined // eslint-disable-line no-proto
  t.end()
})
