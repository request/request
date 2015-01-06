'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')


function runTest (t, options) {

  var server = http.createServer(function(req, res) {

    var data = ''
    req.setEncoding('utf8')

    req.on('data', function(d) {
      data += d
    })

    req.on('end', function() {
      if (options.qs) {
        t.equal(req.url, '/?rfc3986=%21%2A%28%29%27')
      }
      if (options.form) {
        t.equal(data, 'rfc3986=%21%2A%28%29%27')
      }
      if (options.body) {
        if (options.headers) {
          t.equal(data, 'rfc3986=%21%2A%28%29%27')
        }
        else {
          t.equal(data, '{"rfc3986":"%21%2A%28%29%27"}')
        }
      }
      if (typeof options.json === 'object') {
        t.equal(data, '{"rfc3986":"%21%2A%28%29%27"}')
      }

      res.writeHead(200)
      res.end('done')
    })
  })

  server.listen(8080, function() {

    request.post('http://localhost:8080', options, function(err, res, body) {
      t.equal(err, null)
      server.close()
      t.end()
    })
  })
}

var cases = [
  {qs: {rfc3986: '!*()\''}},
  {qs: {rfc3986: '!*()\''}, json: true},
  {form: {rfc3986: '!*()\''}},
  {form: {rfc3986: '!*()\''}, json: true},
  {qs: {rfc3986: '!*()\''}, form: {rfc3986: '!*()\''}},
  {qs: {rfc3986: '!*()\''}, form: {rfc3986: '!*()\''}, json: true},
  {
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: 'rfc3986=!*()\'',
    json: true
  },
  {
    body: {rfc3986: '!*()\''}, json: true
  },
  {
    json: {rfc3986: '!*()\''}
  }
]

cases.forEach(function (options, index) {
  tape('rfc3986 ' + index, function(t) {
    runTest(t, options)
  })
})
