var server = require('./server')
  , events = require('events')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var local = 'http://localhost:8888/asdf'

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

try {
  request('/invalid').on('error', function (e) {
    assert.equal(e.message, 'Invalid URI "/invalid"')
  });
} catch (e) {
  assert.fail("Should not throw");
}

try {
  request('').on('error', function (e) {
    assert.equal(e.message, 'options.uri is a required argument')
  });
} catch (e) {
  assert.fail("Should not throw");
}

console.log("All tests passed.")
