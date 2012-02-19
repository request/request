var request = request = require('../main.js')
  , assert = require('assert')
  , url = require('url')
  , qs = require('querystring')
  , server = require('./server')
  , s = server.createServer()
  ;
 
s.listen(s.port, function () {
  var serverUri = 'http://localhost:' + s.port
    , numTests = 0
    , numOutstandingTests = 0

  function createTest(requestObj, query, serverAssertFn) {
    var testNumber = numTests;
    numTests += 1;
    numOutstandingTests += 1;
    s.on('/' + testNumber, function (req, res) {
      serverAssertFn(req, res);
      res.writeHead(200);
      res.end();
    });
    requestObj.url = serverUri + '/' + testNumber + query
    request(requestObj, function (err, res, body) {
      assert.ok(!err)
      assert.equal(res.statusCode, 200)
      numOutstandingTests -= 1
      if (numOutstandingTests === 0) {
        console.log(numTests + ' tests passed.')
        s.close()
      }
    })
  }

  // Test adding a querystring
  createTest({ qs: { q : 'search' } }, '', function (req, res) {
    var result = qs.parse(url.parse(req.url).query)
    assert.deepEqual({ q : 'search' }, result)
  })

  // Test replacing a querystring value
  createTest({ qs: { q : 'search' } }, '?q=abc', function (req, res) {
    var result = qs.parse(url.parse(req.url).query)
    assert.deepEqual({ q : 'search' }, result)
  })

  // Test appending a querystring value to the ones present in the uri
  createTest({ qs: { q : 'search' } }, '?x=y', function (req, res) {
    var result = qs.parse(url.parse(req.url).query)
    assert.deepEqual({ q : 'search', x : 'y' }, result)
  })
})