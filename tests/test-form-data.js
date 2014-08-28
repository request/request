var assert = require('assert')
var http = require('http');
var path = require('path');
var mime = require('mime-types');
var request = require('../index');
var fs = require('fs');

var remoteFile = 'http://nodejs.org/images/logo.png';

var multipartFormData = {};

var server = http.createServer(function(req, res) {

  // temp workaround
  var data = '';
  req.setEncoding('utf8');

  req.on('data', function(d) {
    data += d;
  });

  req.on('end', function() {
    // check for the fields' traces

    // 1st field : my_field
    assert.ok( data.indexOf('form-data; name="my_field"') != -1 );
    assert.ok( data.indexOf(multipartFormData.my_field) != -1 );

    // 2nd field : my_buffer
    assert.ok( data.indexOf('form-data; name="my_buffer"') != -1 );
    assert.ok( data.indexOf(multipartFormData.my_buffer) != -1 );

    // 3rd field : my_file
    assert.ok( data.indexOf('form-data; name="my_file"') != -1 );
    assert.ok( data.indexOf('; filename="'+path.basename(multipartFormData.my_file.path)+'"') != -1 );
    // check for unicycle.jpg traces
    assert.ok( data.indexOf('2005:06:21 01:44:12') != -1 );
    assert.ok( data.indexOf('Content-Type: '+mime.lookup(multipartFormData.my_file.path) ) != -1 );

    // 4th field : remote_file
    assert.ok( data.indexOf('form-data; name="remote_file"') != -1 );
    assert.ok( data.indexOf('; filename="'+path.basename(multipartFormData.remote_file.path)+'"') != -1 );
    // check for http://nodejs.org/images/logo.png traces
    assert.ok( data.indexOf('ImageReady') != -1 );
    assert.ok( data.indexOf('Content-Type: '+mime.lookup(remoteFile) ) != -1 );

    res.writeHead(200);
    res.end('done');

  });


});

server.listen(8080, function() {

  // @NOTE: multipartFormData properties must be set here so that my_file read stream does not leak in node v0.8
  multipartFormData.my_field = 'my_value';
  multipartFormData.my_buffer = new Buffer([1, 2, 3]);
  multipartFormData.my_file = fs.createReadStream(__dirname + '/unicycle.jpg');
  multipartFormData.remote_file = request(remoteFile);

  var req = request.post({
    url: 'http://localhost:8080/upload',
    formdata: multipartFormData
  }, function () {
    server.close();
  })

});
