'use strict'

var request = require('../index')
var server = require('./server')
var tape = require('tape')

var s = server.createServer()

var path = '/upload'

s.on(path, function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(req.headers))
})

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

// since form-data has been updated to ~2.3.1, this test appears to have become redundant
// The try catch wrapper around the code for this flow has been retained for sanity
tape.skip('large formData should return an error', function (t) {
  request({
    uri: s.url + path,
    method: 'post',
    formData: {foo: new Array(3e4).fill('bar')}
  }, function (err) {
    t.notEqual(err, null)
    t.equal(typeof err, 'object')
    t.equal(err.name, 'Error')
    t.equal(err.message, 'write EPIPE')
    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
