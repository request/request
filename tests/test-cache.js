var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();

var Cache = function () {
    this.cache = {};

    this.get = function(key, cb, read_cb) {
        var r = this.cache[key] || null;
        if (r === null && read_cb) {
          r = read_cb();
          this.set(key, r));
        }
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

var counter = 0;
(function () {
 etag = 'someetag';
 expectedBody = 'testbody';
 test = { 
    resp : server.createEtagResponse(etag, expectedBody),
    cache: new Cache()
  };
  s.on('/', test.resp);
  test.uri = s.url + '/';
  request(test, function (err, resp, body) {
    if (err) throw err;
    assert.ok(resp.statusCode == 200);
    assert.ok(expectedBody == body);

    request(test, function (err, resp, body) {
      if (err) throw err;
      assert.ok(resp.statusCode == 304);
      assert.ok(expectedBody == body);

      counter = counter - 1;
      if (counter === 0) {
        s.close();
      }
    });
  });
  counter ++;
})();

