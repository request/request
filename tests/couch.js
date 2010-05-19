var request = require('../lib/main'), 
    sys = require('sys');

function testports (port) {
  var uri = port ? 'http://mikeal.couchone.com' + ":" + port : 'http://mikeal.couchone.com';
  sys.puts(uri)
  request({uri:uri}, function (error, response, body) {
    if (error) {throw new Error(error)};
    if (!response.statusCode == 200) {
      throw new Error("Wrong status code "+response.statusCode);
    }
    var v = '{"couchdb":"Welcome",'
    if (body.slice(0, v.length) !== v) {
      throw new Error("Unexpected body\n"+body);
    }
  })
}
testports();
testports(80)
testports(5984)

var randomnumber=Math.floor(Math.random()*11).toString();
request({uri:'http://mikeal.couchone.com/testjs', method:'POST', body:'{"_id":"'+randomnumber+'"}'}, 
        function (error, response, body) {
          if (error) {throw new Error(error)};
          if (!response.statusCode == 201) {
            throw new Error("Wrong status code "+response.statusCode);
          }
        });

request({uri:'http://gmail.com'}, function (error, response, body) {
  sys.puts(error)
})