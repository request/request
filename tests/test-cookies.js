try {
  require('request-cookies')
} catch (e) {
  console.error('request-cookies must be installed to run this test.')
  console.error('skipping this test. please install tough-cookie and run again if you need to test this feature.')
  process.exit(0)
}

var assert = require('assert')
  , request = require('../index')


function simpleCookieCreationTest() {
  var cookie = request.cookie('foo=bar')
  assert(cookie.key === 'foo')
  assert(cookie.value === 'bar')
}

simpleCookieCreationTest()
