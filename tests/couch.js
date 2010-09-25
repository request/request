var request = require('../main')
  , sys = require('sys')
  , assert = require('assert')
  , h = {'content-type': 'application/json', 'accept': 'application/json'}
  ;

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

function testportsStream (port) {
  var uri = port ? 'http://mikeal.couchone.com' + ":" + port : 'http://mikeal.couchone.com';
  sys.puts(uri)
  var body = ''
  var bs = {write:function (chunk) {body += chunk}}
  request({uri:uri}, function (error, response) {
    if (error) {throw new Error(error)};
    assert.equal(response.statusCode, 200);
    assert.equal(body.slice(0, '{"couchdb":"Welcome",'.length), '{"couchdb":"Welcome",');
  })
}
testports();
var randomnumber=Math.floor(Math.random()*100000000).toString();
request({uri:'http://mikeal.couchone.com/testjs', method:'POST', headers: h, body:'{"_id":"'+randomnumber+'"}'}, 
        function (error, response, body) {
          if (error) {throw new Error(error)};
          assert.equal(response.statusCode, 201, body);
        });

var options = {uri:'http://gmail.com'};
request(options, function (error, response, body) {
  assert.equal(response.statusCode, 200);
  assert.equal(options.uri.host, 'www.google.com');
  assert.equal(response.socket.port, 443);
})