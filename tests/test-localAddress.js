var request = request = require('../index')
  , assert = require('assert')
  ;
 
request.get({
  uri: 'http://www.google.com', localAddress: '127.0.0.1'
}, function(err) {
  assert.equal(err.code, 'ENETUNREACH')
})
