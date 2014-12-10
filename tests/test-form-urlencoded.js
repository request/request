'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')


tape('application/x-www-form-urlencoded', function(t) {

  var server = http.createServer(function(req, res) {

    t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
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

      t.end()
    })
  })

  server.listen(8080, function() {

    request.post('http://localhost:8080', {
      form: {some: 'url', encoded: 'data'},
      json: true
    }, function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close()
    })
  })
})
