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
    if (req.headers.authorization == 'Digest username="test", realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm="MD5", uri="/test/", qop=auth, nc=00000001, cnonce="", response="f76f206bc0c7f68aaefa7ec14d46cdb3"') {
      ok = true;
    } else if (req.headers.authorization == 'Digest username="test", realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm="MD5", uri="/test/", qop=auth, nc=00000002, cnonce="", response="522689e3a90ca5258f99642d844999da"') {
      ok = true;
    } else if (req.headers.authorization == 'Digest username="test", realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm="MD5", uri="/test/", qop=auth, nc=00000003, cnonce="", response="3eca98fe20ec42a8a34ff9c0969a3e3e"') {
      ok = true;
    } else if (req.headers.authorization == 'Digest username="test", realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm="MD5", uri="/test/", qop=auth, nc=00000004, cnonce="", response="b505b7f0cdabc8ffd6fd939115500857"') {
      ok = true;
    } else if (req.headers.authorization == 'Digest username="test", realm="Private", nonce="WpcHS2/TBAA=dffcc0dbd5f96d49a5477166649b7c0ae3866a93", algorithm="MD5", uri="/test/", qop=auth, nc=00000005, cnonce="", response="3bf87e38c3d5d44ae8ef7a37dd7453f0"') {
      ok = true;
    } else {
      // Bad auth header, don't send back WWW-Authenticate header
      console.error("Unexpected Authorization header: "+req.headers.authorization)
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

    // test digestAuth option
    digestAuth= request.digestAuth('test','testing',{cnonce:''})
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/test/',
      'digestAuth': digestAuth
    }, function(error, response, body) {
      assert.equal(response.statusCode, 200);
      assert.equal(numDigestRequests, 5);

      // now send another request without needing a new challenge from the server
      request({
        'method': 'GET',
        'uri': 'http://localhost:6767/test/',
        'digestAuth': digestAuth
      }, function(error, response, body) {
        assert.equal(response.statusCode, 200);
        assert.equal(numDigestRequests, 6);

        // now send another request without needing a new challenge from the server
        // Also tests chaining digestAuth
        request.get('http://localhost:6767/test/').digestAuth(digestAuth).on('complete',
          function(response) {
            assert.equal(response.statusCode, 200);
            assert.equal(numDigestRequests, 7);

            // digestAuth overrides auth
            request.get('http://localhost:6767/test/').
              digestAuth(digestAuth).auth('a').
            on('complete',
              function(response) {
                assert.equal(response.statusCode, 200);
                assert.equal(numDigestRequests, 8);


                // digestAuth overrides auth, even when auth is first
                request.get('http://localhost:6767/test/').
                  auth('a').digestAuth(digestAuth).
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
