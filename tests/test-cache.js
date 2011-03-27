var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();

var Cache = function () {
    this.cache = {};

    this.get = function(key, cb) {
        var r = this.cache[key] || null;
        return cb(r);
    };

    this.set = function(key, value) {
        this.cache[key] = value;
    };

    this.del = function(key) {
        delete this.cache[key];
    };
};

(function () {
    var c = new Cache();

    c.get('test', function(result) {
      assert.ok(result === null);
    });

    c.set('test', 'x');
    c.get('test', function(result) {
      assert.ok(result == 'x');
    });

    c.del('test');
    c.get('test', function(result) {
      assert.ok(result === null);
    });
})();

var  tests = {
  testEtag: {
    resp : server.createEtagResponse('e', 200),
    cache: new Cache(),
    expectCacheable: true
  },
  testPut: {
    resp : server.createEtagResponse('e', 200),
    cache: new Cache(),
    method: 'PUT',
    expectCacheable: false
  },
  testModified: {
    resp: server.createExpiresResponse('Tue, 15 Nov 1994 12:45:26 GMT', 200),
    cache: new Cache(),
    expectCacheable: true
  }
};

var counter = 0;
for (i in tests) {
    (function () {
      var test = tests[i];
      s.on('/'+i, test.resp);
      test.uri = s.url + '/' + i;
      console.log("running test for " + i);
      request(test, function (err, resp, body) {
        if (err) throw err;
        assert.ok(resp.statusCode == 200);

        request(test, function (err, resp, body) {
          if (err) throw err;
          assert.ok(resp.statusCode == 200);
          assert.ok(resp.fromCache == test.expectCacheable);

          counter = counter - 1;
        });
      });
      counter ++;
    })();
}

// special case tests
(function () {
 
  var test = {
    cache: new Cache(),
  }
  var path = '/testError';
  s.on(path, server.createEtagResponse('e', 200));
  s.on(path + '#fail', server.createEtagResponse('e', 400));
  test.uri = s.url + path;
  request(test, function (err, resp, body) {
    if (err) throw err;
    assert.ok(resp.statusCode == 200);

    test.uri = s.url + path + '#fail';
    request(test, function (err, resp, body) {
      if (err) throw err;
      assert.ok(resp.statusCode == 400);
      assert.ok(resp.fromCache == false);

      test.uri = s.url + path;
      request(test, function (err, resp, body) {
        if (err) throw err;
        assert.ok(resp.statusCode == 200);
        assert.ok(resp.fromCache == false);

        counter = counter - 1;
        if (counter === 0) {
          console.log("All tests passed.")
          s.close();
        }
      });
    });
  });
  counter++;
})();
