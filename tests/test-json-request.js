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
      t.equal(body.status, 'OK')
      t.deepEqual(body.value, value)
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

tape('cleanup', function(t) {
  s.close()
  t.end()
})
