var server = require('./server')
  , events = require('events')
  , assert = require('assert')
  , request = require('../index')
  ;

var local = 'http://localhost:8888/asdf'

try {
  request({})
  assert.fail("Should have throw")
} catch(e) {
  assert.equal(e.message, 'options.uri is a required argument')
}

try {
  request({uri: 'this-is-not-a-valid-uri'})
  assert.fail("Should have throw")
} catch(e) {
  assert(e.message.indexOf('Invalid URI') === 0)
}

try {
  request({uri: 'github.com/uri-is-not-valid-without-protocol'})
  assert.fail("Should have throw")
} catch(e) {
  assert(e.message.indexOf('Invalid URI') === 0)
}

try {
  request({uri:local, body:{}})
  assert.fail("Should have throw")
} catch(e) {
  assert.equal(e.message, 'Argument error, options.body.')
}

try {
  request({uri:local, multipart: 'foo'})
  assert.fail("Should have throw")
} catch(e) {
  assert.equal(e.message, 'Argument error, options.multipart.')
}

try {
  request({uri:local, multipart: [{}]})
  assert.fail("Should have throw")
} catch(e) {
  assert.equal(e.message, 'Body attribute missing in multipart.')
}

try {
  request(local, {multipart: [{}]})
  assert.fail("Should have throw")
} catch(e) {
  assert.equal(e.message, 'Body attribute missing in multipart.')
}

console.log("All tests passed.")
