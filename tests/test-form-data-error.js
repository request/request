'use strict'

var request = require('../index')
  , server = require('./server')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

tape('re-emit formData errors', function(t) {
  s.on('/', function(req, res) {
    res.writeHead(400)
    res.end()
    t.fail('The form-data error did not abort the request.')
  })

  request.post(s.url, function (err, res, body) {
    t.equal(err.message, 'form-data: Arrays are not supported.')
    setTimeout(function() {
      t.end()
    }, 10)
  }).form().append('field', ['value1', 'value2'])
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
