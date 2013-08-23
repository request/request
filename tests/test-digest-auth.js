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

  if (req.headers.authorization) {
    if (/^Digest username="test", realm="Private", nonce="WpcHS2\/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm="MD5", uri="\/test\/", qop=auth, nc=[0-9]+, cnonce="[a-f0-9]{0,32}", response="[a-f0-9]{32}"$/.exec(req.headers.authorization)) {
      ok = true;
    } else {
      // Bad auth header, don't send back WWW-Authenticate header
      ok = false;
    }
  } else {
    // No auth header, send back WWW-Authenticate header
    ok = false;
    res.setHeader('www-authenticate', 'Digest realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm=MD5, qop="auth"');
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

    // test persistentAuth option
    var persistentAuth= request.persistentAuth('test','testing')
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/test/',
      'persistentAuth': persistentAuth
    }, function(error, response, body) {
      assert.equal(response.statusCode, 200);
      assert.equal(numDigestRequests, 5);

      // now send another request without needing a new challenge from the server
      request({
        'method': 'GET',
        'uri': 'http://localhost:6767/test/',
        'persistentAuth': persistentAuth
      }, function(error, response, body) {
        assert.equal(response.statusCode, 200);
        assert.equal(numDigestRequests, 6);

        // now send another request without needing a new challenge from the server
        // Also tests chaining persistentAuth
        request.get('http://localhost:6767/test/').persistentAuth(persistentAuth).on('complete',
          function(response) {
            assert.equal(response.statusCode, 200);
            assert.equal(numDigestRequests, 7);

            // persistentAuth overrides auth
            request.get('http://localhost:6767/test/').
              persistentAuth(persistentAuth).auth('a').
            on('complete',
              function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(numDigestRequests, 8);


                // persistentAuth overrides auth, even when auth is first
                request.get('http://localhost:6767/test/').
                  auth('a').persistentAuth(persistentAuth).
                on('complete',
                  function(response) {
                    assert.equal(response.statusCode, 200);
                    assert.equal(numDigestRequests, 9);

                    console.log('All tests passed');
                    digestServer.close();
                  }
                );
              }
            );
          }
        );
      });
    });
  });
});
