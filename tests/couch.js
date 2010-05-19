var request = require('../lib/main'), 
    sys = require('sys'),
    assert = require('assert');

function testports (port) {
  var uri = port ? 'http://mikeal.couchone.com' + ":" + port : 'http://mikeal.couchone.com';
  sys.puts(uri)
  request({uri:uri}, function (error, response, body) {
    if (error) {throw new Error(error)};
    assert.equal(response.statusCode, 200);
    assert.equal(body.slice(0, '{"couchdb":"Welcome",'.length), '{"couchdb":"Welcome",');
  })
}
testports();
testports(80)
testports(5984)

var randomnumber=Math.floor(Math.random()*100000000).toString();
request({uri:'http://mikeal.couchone.com/testjs', method:'POST', body:'{"_id":"'+randomnumber+'"}'}, 
        function (error, response, body) {
          if (error) {throw new Error(error)};
          assert.equal(response.statusCode, 201);
        });

var options = {uri:'http://gmail.com'};
request(options, function (error, response, body) {
  assert.equal(response.statusCode, 200);
  assert.equal(options.uri.host, 'www.google.com');
  assert.equal(response.socket.port, 443);
})