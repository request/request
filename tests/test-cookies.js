try {
  require('tough-cookie')
} catch (e) {
  console.error('tough-cookie must be installed to run this test.')
  console.error('skipping this test. please install tough-cookie and run again if you need to test this feature.')
  process.exit(0)
}

var assert = require('assert')
  , http = require('http')
  , request = require('../index')


function simpleCookieCreationTest() {
  var cookie = request.cookie('foo=bar')
  assert(cookie.key === 'foo')
  assert(cookie.value === 'bar')
}

simpleCookieCreationTest()

var requests = 0;
var validUrl = 'http://localhost:6767/valid';
var invalidUrl = 'http://localhost:6767/invalid';

var server = http.createServer(function (req, res) {
  requests++;
  if (req.url === '/valid')
    res.setHeader('set-cookie', 'foo=bar');
  else if (req.url === '/invalid')
    res.setHeader('set-cookie', 'foo=bar; Domain=foo.com');
  res.end('okay');
  if (requests === 2) server.close();
});
server.listen(6767);

var jar1 = request.jar();
request({
  method: 'GET',
  url: validUrl,
  jar: jar1
},
function (error, response, body) {
  if (error) throw error;
  assert.equal(jar1.getCookieString(validUrl), 'foo=bar');
  assert.equal(body, 'okay');

  var cookies = jar1.getCookies(validUrl);
  assert(cookies.length == 1);
  assert(cookies[0].key === 'foo');
  assert(cookies[0].value === 'bar');
});

var jar2 = request.jar();
request({
  method: 'GET',
  url: invalidUrl,
  jar: jar2
},
function (error, response, body) {
  if (error) throw error;
  assert.equal(jar2.getCookieString(validUrl), '');
  assert.deepEqual(jar2.getCookies(validUrl), []);
  assert.equal(body, 'okay');
});

