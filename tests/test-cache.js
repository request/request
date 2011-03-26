var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();

var Cache = function () {
    this.cache = {};

    this.get = function(key) {
        var r = this.cache[key];
        if (r === undefined) {
            return null;
        } else {
            return r;
        }
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

    assert.ok(c.get('test') === null);
    
    c.set('test', 'x');
    assert.ok(c.get('test') == 'x');

    c.del('test');
    assert.ok(c.get('test') === null);
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

