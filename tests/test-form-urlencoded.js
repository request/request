'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')


function runTest (t, options) {

  var server = http.createServer(function(req, res) {

    t.ok(req.headers['content-type'].match(/application\/x-www-form-urlencoded/))
    t.equal(req.headers.accept, 'application/json')

    var data = ''
    req.setEncoding('utf8')

    req.on('data', function(d) {
      data += d
    })

    req.on('end', function() {
      t.equal(data, 'some=url&encoded=data')

      res.writeHead(200)
      res.end('done')
    })
  })

  server.listen(6767, function() {

    request.post('http://localhost:6767', options, function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close(function() {
        t.end()
      })
    })
  })
}

var cases = [
  {
    form: {some: 'url', encoded: 'data'},
    json: true
  },
  {
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: 'some=url&encoded=data',
    json: true
  }
]

cases.forEach(function (options, index) {
  tape('application/x-www-form-urlencoded ' + index, function(t) {
    runTest(t, options)
  })
})
