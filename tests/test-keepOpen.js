'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')
var server

tape('setup', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    req.pipe(res)
  })
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('keepOpen option', function (t) {
  var testData = 'test request data'
  var stream

  stream = request.post({
    url: server.url,
    keepOpen: true
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, testData + testData)
    t.end()
  })

  setImmediate(function () {
    stream.write(testData)

    setImmediate(function () {
      stream.write(testData)
      stream.end()
    })
  })
})

tape('without keepOpen option', function (t) {
  var stream

  stream = request.post({
    url: server.url
  }, function (err, res, body) {
    var hasError = false

    t.equal(err, null)

    stream.on('error', function (err) {
      t.equal(err.message, 'write after end')
      hasError = true
    })

    stream.write('test data')

    setImmediate(function () {
      t.equal(hasError, true)
      t.end()
    })
  })
})

tape('cleanup', function (t) {
  server.close(t.end)
})
