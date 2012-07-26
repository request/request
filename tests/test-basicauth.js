
var request = require('../main')
  , http = require('http')
  , assert = require('assert')
  ;

var s = http.createServer(function (req, resp) {
  resp.statusCode = 200;
  var base64data = req.headers.authorization.match(/^Basic (.+)$/)[1];
  var reqCred = (new Buffer(base64data, "base64").toString()).split(":");
  resp.end(JSON.stringify(reqCred));
}).listen(8080, function () {
  request({
    uri: 'http://localhost:8080',
    basicAuth: ["username", "password"]
  }, function(err, resp, body){
    if (err) throw err;
    var resCred = JSON.parse(body);
    assert.deepEqual(resCred, ["username", "password"]);
    s.close();
  });
});

