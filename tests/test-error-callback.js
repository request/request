var assert = require('assert');
var request = require('../index');
var http = require('http');
  
var body = 'success';
var statusCode = 200;

var s = http.createServer(function(req, res) {
  res.setHeader('Content-Length', '6');
  res.statusCode = statusCode;
  res.end(body);
}).listen('6767', function () {

  request('http://localhost:6767/', function (error, response, response_body) {
    JSON.stringify(error);

    // Make sure error comes through
    assert.equal(JSON.stringify(error), JSON.stringify({ bytesParsed: 105, code: 'HPE_INVALID_CONSTANT' }));

    // Make sure response comes through
    assert.equal(response.statusCode, statusCode);

    // Make sure body comes through
    assert.equal(response_body, body.substring(0, 6));

    console.log('All tests passed.');
    s.close();
  });
  
});