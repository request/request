var assert = require('assert')
  , request = require('../index')
  , http = require('http')
  ;

var count = 0;
var methodsSeen = {
  head: 0
, get: 0
};

var s = http.createServer(function(req, res) {
  res.statusCode = 200;
  res.end('');
  count++;

  if (req.method.toLowerCase() === 'head') methodsSeen.head++;
  if (req.method.toLowerCase() === 'get') methodsSeen.get++;

  if (count < 2) return
  assert(methodsSeen.head === 1);
  assert(methodsSeen.get === 1);
}).listen(6767, function () {

  //this is a simple check to see if the options object is be mutilated
  var url = 'http://localhost:6767';
  var options = {url: url};

  request.head(options, function (err, resp, body) {
    assert(Object.keys(options).length === 1);
    assert(options.url === url);
    request.get(options, function (err, resp, body) {
      assert(Object.keys(options).length === 1);
      assert(options.url === url);
      s.close();
    })
  })
})