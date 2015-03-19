'use strict'

var server = require('./server')
  , request = require('../index')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

function testJSONValue(testId, value) {
  tape('test ' + testId, function(t) {
    var testUrl = '/' + testId
    s.on(testUrl, server.createPostJSONValidator(value, 'application/json'))
    var opts = {
      method: 'PUT',
      uri: s.url + testUrl,
      json: true,
      body: value
    }
    request(opts, function (err, resp, body) {
      t.equal(err, null)
      t.equal(resp.statusCode, 200)
      t.deepEqual(body, value)
      t.end()
    })
  })
}

function testJSONValueReviver(testId, value, reviver, revivedValue) {
  tape('test ' + testId, function(t) {
    var testUrl = '/' + testId
    s.on(testUrl, server.createPostJSONValidator(value, 'application/json'))
    var opts = {
      method: 'PUT',
      uri: s.url + testUrl,
      json: true,
      jsonReviver: reviver,
      body: value
    }
    request(opts, function (err, resp, body) {
      t.equal(err, null)
      t.equal(resp.statusCode, 200)
      t.deepEqual(body, revivedValue)
      t.end()
    })
  })
}

testJSONValue('jsonNull', null)
testJSONValue('jsonTrue', true)
testJSONValue('jsonFalse', false)
testJSONValue('jsonNumber', -289365.2938)
testJSONValue('jsonString', 'some string')
testJSONValue('jsonArray', ['value1', 2, null, 8925.53289, true, false, ['array'], { object: 'property' }])
testJSONValue('jsonObject', {
  trueProperty: true,
  falseProperty: false,
  numberProperty: -98346.34698,
  stringProperty: 'string',
  nullProperty: null,
  arrayProperty: ['array'],
  objectProperty: { object: 'property' }
})

testJSONValueReviver('jsonReviver', -48269.592, function (k, v) {
  return v * -1
}, 48269.592)
testJSONValueReviver('jsonReviverInvalid', -48269.592, 'invalid reviver', -48269.592)

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
