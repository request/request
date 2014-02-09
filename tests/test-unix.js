var assert = require('assert')
  , request = require('../index')
  , http = require('http')
  , fs = require('fs')
  ;
  
var path = [null, 'test', 'path'].join('/');
var socket = [__dirname, 'tmp-socket'].join('/');
var body = 'connected';
var statusCode = 200;

var s = http.createServer(function(req, res) {
  // Assert requested path is sent to server
  assert.equal(req.url, path);
  res.statusCode = statusCode;
  res.end(body);
}).listen(socket, function () {

  request(['unix://', socket, path].join(''), function (error, response, response_body) {
    // Assert no error in connection
    assert.equal(error, null);
    // Assert http success status code 
    assert.equal(response.statusCode, statusCode);
    // Assert expected response body is recieved
    assert.equal(response_body, body);
    // clean up
    s.close();
    fs.unlink(socket, function(){});
  })
  
})