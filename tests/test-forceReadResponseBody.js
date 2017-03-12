
var http = require('http')
var tape = require('tape')
var request = require('../')
var server


tape('before', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    res.writeHead(200, {
      'content-type': req.headers['content-type']
    })
    req.pipe(res)
  })
  server.listen(0, function() {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('forceReadResponseBody option', function (t) {
  var testData = 'test request data'
    , stream
  
  stream = request.post({
    uri: server.url,
    body: testData,
    forceReadResponseBody: true
  })

  stream.on('complete', function(res, body) {
    t.equal(res.statusCode, 200)
    t.equal(body, testData)
    t.end()
  })
})

tape('without forceReadResponseBody option', function (t) {
  var testData = 'test request data'
    , stream
  
  stream = request.post({
    uri: server.url,
    body: testData
  })

  stream.on('complete', function(res, body) {
    t.equal(res.statusCode, 200)
    t.equal(body, undefined)
    t.end()
  })
})

tape('forceReadResponseBody and json option', function (t) {
  var testData
    , stream

  testData = {
    test: {
      payload: 'test'
    }
  }
  
  stream = request.post({
    uri: server.url,
    body: testData,
    json: true,
    forceReadResponseBody: true
  })

  stream.on('complete', function(res, body) {
    t.equal(res.statusCode, 200)
    t.equal(typeof body, 'object')
    t.deepEqual(body, testData)
    t.end()
  })
})

tape('after', function (t) {
  server.close(t.end)
})
