var assert = require('assert')
  , http = require('http')
  , request = require('../index')
  ;

// Test digest auth
// Using header values captured from interaction with Apache

var numDigestRequests = 0;

var digestServer = http.createServer(function (req, res) {
  console.error('Digest auth server: ', req.method, req.url);
  numDigestRequests++;

  var ok;

  if (req.url === '/test/') {
    if (req.headers.authorization) {
      if (/^Digest username="test", realm="Private", nonce="WpcHS2\/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", uri="\/test\/", qop=auth, response="[a-f0-9]{32}", nc=00000001, cnonce="[a-f0-9]{32}", algorithm=MD5, opaque="5ccc069c403ebaf9f0171e9517f40e41"$/.exec(req.headers.authorization)) {
        ok = true;
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false;
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false;
      res.setHeader('www-authenticate', 'Digest realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm=MD5, qop="auth", opaque="5ccc069c403ebaf9f0171e9517f40e41"');
    }
  } else if (req.url === '/dir/index.html') {
    // RFC2069-compatible mode
    // check: http://www.rfc-editor.org/errata_search.php?rfc=2069
    if (req.headers.authorization) {
      if (/^Digest username="Mufasa", realm="testrealm@host.com", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", uri="\/dir\/index.html", response="[a-f0-9]{32}", opaque="5ccc069c403ebaf9f0171e9517f40e41"$/.exec(req.headers.authorization)) {
        ok = true;
      } else {
        // Bad auth header, don't send back WWW-Authenticate header
        ok = false;
      }
    } else {
      // No auth header, send back WWW-Authenticate header
      ok = false;
      res.setHeader('www-authenticate', 'Digest realm="testrealm@host.com", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"');
    }
  }

  if (ok) {
    console.log('request ok');
    res.end('ok');
  } else {
    console.log('status=401');
    res.statusCode = 401;
    res.end('401');
  }
});

digestServer.listen(6767);

request({
  'method': 'GET',
  'uri': 'http://localhost:6767/test/',
  'auth': {
    'user': 'test',
    'pass': 'testing',
    'sendImmediately': false
  }
}, function(error, response, body) {
  assert.equal(response.statusCode, 200);
  assert.equal(numDigestRequests, 2);

  // If we don't set sendImmediately = false, request will send basic auth
  request({
    'method': 'GET',
    'uri': 'http://localhost:6767/test/',
    'auth': {
      'user': 'test',
      'pass': 'testing'
    }
  }, function(error, response, body) {
    assert.equal(response.statusCode, 401);
    assert.equal(numDigestRequests, 3);

    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/dir/index.html',
      'auth': {
        'user': 'Mufasa',
        'pass': 'CircleOfLife',
      'sendImmediately': false
      }
    }, function(error, response, body) {
      assert.equal(response.statusCode, 200);
      assert.equal(numDigestRequests, 5);

      console.log('All tests passed');
      digestServer.close();
    });
  });
});
