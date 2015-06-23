'use strict'

var http = require('http')
  , request = require('../index')
  , tape = require('tape')


function runTest (t, options, index) {

  var server = http.createServer(function(req, res) {

    if (index === 0 || index === 3) {
      t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    } else {
      t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded; charset=UTF-8')
    }
    t.equal(req.headers['content-length'], '21')
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

    var r = request.post('http://localhost:6767', options, function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close(function() {
        t.end()
      })
    })
    if (!options.form && !options.body) {
      r.form({some: 'url', encoded: 'data'})
    }
  })
}

var cases = [
  {
    form: {some: 'url', encoded: 'data'},
    json: true
  },
  {
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    form: {some: 'url', encoded: 'data'},
    json: true
  },
  {
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: 'some=url&encoded=data',
    json: true
  },
  {
    // body set via .form() method
    json: true
  }
]

cases.forEach(function (options, index) {
  tape('application/x-www-form-urlencoded ' + index, function(t) {
    runTest(t, options, index)
  })
})
