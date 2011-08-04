var server  = require('./redirect-server')
  , assert  = require('assert')
  , request = require('../main.js')


var s = server.createServer();
var tests = [function() {
  // test to make sure page 1 redirects to page 2 when getting a GET request
  var url = s.url + '/' + 'page1';

  request({ url: url }, function(err, resp, body) {
    assert.ok(body.match(/Page 2!/));
    
    finishTest();
  });
}, function() {
// test to make sure page 1 redirects to page 2 when getting a POST request
  var url = s.url + '/' + 'page1';

  request({ url: url, method: 'POST'}, function(err, resp, body) {
    assert.ok(body.match(/Page 2!/));

    finishTest();
  });
}];

var totalTests = tests.length;

tests.forEach(function(test) {
  test();
});

function finishTest() {
  totalTests--;

  if (totalTests == 0) {
    console.log("All tests passed");
    s.close();
  }
}
