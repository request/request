try {
  require('tough-cookie')
} catch (e) {
  console.error('tough-cookie must be installed to run this test.')
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