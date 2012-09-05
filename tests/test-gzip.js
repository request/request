var request = require('../main.js');
var http = require('http');
var assert = require('assert');
var zlib = require('zlib');


var server = http.createServer(function (req, res) {
  console.error(req.method, req.url);

  res.statusCode = 200;
  test_body = 'wunderbar a test body for you\n';

  if(req.headers['accept-encoding'] && req.headers['accept-encoding'] == 'gzip')
  {
    if(!Buffer.isBuffer(test_body))
    {
      test_body = new Buffer(test_body);
    }
    zlib.gzip(test_body, function (err, data) {
      if (!err)
      {
        res.setHeader('Content-Encoding', 'gzip');
        res.end(data);
      }
      else
      {
        throw new Error(err)
      }
    });
  }
  else
  {
    res.setHeader('Content-Encoding', 'text/plain');
    res.end(test_body);
  }
});
server.listen(6767);

/*
// assert default behavior is to send gzip support
var h = { 'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Win64; x64; Trident/5.0' };
request({ method: 'GET', url: 'http://google.com', headers: h }, function (er, req, body) {
  if (er) throw er;

   assert.equal(req.headers['content-encoding'], 'gzip');
   assert.equal(body, 'wunderbar a test body for you\n');  
  console.error('ok - ' + process.version);
});

*/

// assert default behavior is to send gzip support
request.get({ url: 'http://localhost:6767/foo' }, function (er, req, body) {
  if (er) throw er;
  assert.equal(req.headers['content-encoding'], 'gzip');
  assert.equal(body, 'wunderbar a test body for you\n');
  console.error('ok - ' + process.version);
});



// assert manually setting Accept-Encoding disables gzip
var headers = { 'Accept-Encoding': '' };
request.get({ url: 'http://localhost:6767/foo', headers: headers  }, function (er, req, body) {
  if (er) throw er;
  assert.equal(req.headers['content-encoding'], 'text/plain');
  assert.equal(body, 'wunderbar a test body for you\n');
  console.error('ok - ' + process.version);
  server.close();
});

