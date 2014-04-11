var assert = require('assert')
  , http = require('http')
  , request = require('../index')
  ;

var numBasicRequests = 0;

var basicServer = http.createServer(function (req, res) {
  console.error('Bearer auth server: ', req.method, req.url);
  numBasicRequests++;

  var ok;

  if (req.headers.authorization) {
    if (req.headers.authorization == 'Bearer theToken') {
      ok = true;
    } else {
      // Bad auth header, don't send back WWW-Authenticate header
      ok = false;
    }
  } else {
    // No auth header, send back WWW-Authenticate header
    ok = false;
    res.setHeader('www-authenticate', 'Bearer realm="Private"');
  }

  if (req.url == '/post/') {
    var expectedContent = 'data_key=data_value';
    req.on('data', function(data) {
      assert.equal(data, expectedContent);
      console.log('received request data: ' + data);
    });
    assert.equal(req.method, 'POST');
    assert.equal(req.headers['content-length'], '' + expectedContent.length);
    assert.equal(req.headers['content-type'], 'application/x-www-form-urlencoded; charset=utf-8');
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

basicServer.listen(6767);

var tests = [
  function(next) {
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/test/',
      'auth': {
        'bearer': 'theToken',
        'sendImmediately': false
      }
    }, function(error, res, body) {
      assert.equal(res.statusCode, 200);
      assert.equal(numBasicRequests, 2);
      next();
    });
  },

  function(next) {
    // If we don't set sendImmediately = false, request will send bearer auth
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/test2/',
      'auth': {
        'bearer': 'theToken'
      }
    }, function(error, res, body) {
      assert.equal(res.statusCode, 200);
      assert.equal(numBasicRequests, 3);
      next();
    });
  },

  function(next) {
    request({
      'method': 'POST',
      'form': { 'data_key': 'data_value' },
      'uri': 'http://localhost:6767/post/',
      'auth': {
        'bearer': 'theToken',
        'sendImmediately': false
      }
    }, function(error, res, body) {
      assert.equal(res.statusCode, 200);
      assert.equal(numBasicRequests, 5);
      next();
    });
  },

  function (next) {
    request
      .get('http://localhost:6767/test/')
      .auth(null,null,false,"theToken")
      .on('response', function (res) {
        assert.equal(res.statusCode, 200);
        assert.equal(numBasicRequests, 7);
        next();
      })
  },

  function (next) {
    request
      .get('http://localhost:6767/test/')
      .auth(null,null,true,"theToken")
      .on('response', function (res) {
        assert.equal(res.statusCode, 200);
        assert.equal(numBasicRequests, 8);
        next();
      })
  },

  function(next) {
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/test/',
      'auth': {
        'bearer': function() { return 'theToken' },
        'sendImmediately': false
      }
    }, function(error, res, body) {
      assert.equal(res.statusCode, 200);
      assert.equal(numBasicRequests, 10);
      next();
    });
  },

  function(next) {
    // If we don't set sendImmediately = false, request will send bearer auth
    request({
      'method': 'GET',
      'uri': 'http://localhost:6767/test2/',
      'auth': {
        'bearer': function() { return 'theToken' }
      }
    }, function(error, res, body) {
      assert.equal(res.statusCode, 200);
      assert.equal(numBasicRequests, 11);
      next();
    });
  },
];

function runTest(i) {
  if (i < tests.length) {
    tests[i](function() {
      runTest(i + 1);
    });
  } else {
    console.log('All tests passed');
    basicServer.close();
  }
}

runTest(0);
