'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')
  , server


tape('setup', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    req.pipe(res)
  })
  server.listen(0, function() {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('endRequest option', function (t) {
  var testData = 'test request data'
    , stream
   
  stream = request.post({
    url: server.url,
    endRequest: false
  }, function(err, res, body) {
    t.equal(res.statusCode, 200)
    t.equal(body, testData + testData)
    t.end()
  })

  setTimeout(function() {
    stream.write(testData)
  }, 10)

  setTimeout(function() {
    stream.write(testData)
    stream.end()
  }, 20)
})

tape('without endRequest option', function (t) {
  var stream
   
  stream = request.post({
    url: server.url
  }, function(err, res, body) {
    stream.on('error', function(err) {
      t.equal(err.message, 'write after end')
      t.end()
    })

    stream.write('test data')
  })
})

tape('cleanup', function(t) {
  server.close(t.end)
})
