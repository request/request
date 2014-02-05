try {
  require('request-cookies')
} catch (e) {
  console.error('request-cookies must be installed to run this test.')
  console.error('skipping this test. please install request-cookies and run again if you need to test this feature.')
  process.exit(0)
}

var request = require('../index');
var http = require('http');
var requests = 0;
var assert = require('assert');

var server = http.createServer(function (req, res) {
  requests ++;

  // redirect everything 3 times, no matter what.
  var c = req.headers.cookie;

  if (!c) c = 0;
  else c = +c.split('=')[1] || 0;

  if (c > 3) {
    res.end('ok: '+requests);
    return;
  }

  res.setHeader('set-cookie', 'c=' + (c + 1));
  res.setHeader('location', req.url);
  res.statusCode = 302;
  res.end('try again, i guess\n');
});
server.listen(6767);

request.post({ url: 'http://localhost:6767/foo',
               followAllRedirects: true,
               jar: true,
               form: { foo: 'bar' } }, function (er, req, body) {
  if (er) throw er;
  assert.equal(body, 'ok: 5');
  assert.equal(requests, 5);
  console.error('ok - ' + process.version);
  server.close();
});
