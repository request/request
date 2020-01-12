'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')

const s = server.createServer()

tape('setup', (t) => {
  s.listen(0, () => {
    t.end()
  })
})

function testJSONValue (testId, value) {
  tape('test ' + testId, (t) => {
    const testUrl = '/' + testId
    s.on(testUrl, server.createPostJSONValidator(value, 'application/json'))
    const opts = {
      method: 'PUT',
      uri: s.url + testUrl,
      json: true,
      body: value
    }
    request(opts, (err, resp, body) => {
      t.equal(err, null)
      t.equal(resp.statusCode, 200)
      t.deepEqual(body, value)
      t.end()
    })
  })
}

function testJSONValueReviver (testId, value, reviver, revivedValue) {
  tape('test ' + testId, (t) => {
    const testUrl = '/' + testId
    s.on(testUrl, server.createPostJSONValidator(value, 'application/json'))
    const opts = {
      method: 'PUT',
      uri: s.url + testUrl,
      json: true,
      jsonReviver: reviver,
      body: value
    }
    request(opts, (err, resp, body) => {
      t.equal(err, null)
      t.equal(resp.statusCode, 200)
      t.deepEqual(body, revivedValue)
      t.end()
    })
  })
}

function testJSONValueReplacer (testId, value, replacer, replacedValue) {
  tape('test ' + testId, (t) => {
    const testUrl = '/' + testId
    s.on(testUrl, server.createPostJSONValidator(replacedValue, 'application/json'))
    const opts = {
      method: 'PUT',
      uri: s.url + testUrl,
      json: true,
      jsonReplacer: replacer,
      body: value
    }
    request(opts, (err, resp, body) => {
      t.equal(err, null)
      t.equal(resp.statusCode, 200)
      t.deepEqual(body, replacedValue)
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

testJSONValueReviver('jsonReviver', -48269.592, (k, v) => {
  return v * -1
}, 48269.592)
testJSONValueReviver('jsonReviverInvalid', -48269.592, 'invalid reviver', -48269.592)

testJSONValueReplacer('jsonReplacer', -48269.592, (k, v) => {
  return v * -1
}, 48269.592)
testJSONValueReplacer('jsonReplacerInvalid', -48269.592, 'invalid replacer', -48269.592)
testJSONValueReplacer('jsonReplacerObject', {foo: 'bar'}, (k, v) => {
  return v.toUpperCase ? v.toUpperCase() : v
}, {foo: 'BAR'})

tape('missing body', (t) => {
  s.on('/missing-body', (req, res) => {
    t.equal(req.headers['content-type'], undefined)
    res.end()
  })
  request({url: s.url + '/missing-body', json: true}, () => {
    t.end()
  })
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
