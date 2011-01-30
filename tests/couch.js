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
