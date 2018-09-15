'use strict'

var http = require('http')
var request = require('../index')
var tape = require('tape')

function runTest (t, options) {
  var server = http.createServer(function (req, res) {
    var data = ''
    req.setEncoding('utf8')

    req.on('data', function (d) {
      data += d
    })

    req.on('end', function () {
      if (options.qs) {
        t.equal(req.url, '/?rfc3986=%21%2A%28%29%27')
      }
      t.equal(data, options._expectBody)

      res.writeHead(200)
      res.end('done')
    })
  })

  server.listen(0, function () {
    var port = this.address().port
    request.post('http://localhost:' + port, options, function (err, res, body) {
      t.equal(err, null)
      server.close(function () {
        t.end()
      })
    })
  })
}

var bodyEscaped = 'rfc3986=%21%2A%28%29%27'
var bodyJson = '{"rfc3986":"!*()\'"}'

var cases = [
  {
    _name: 'qs',
    qs: {rfc3986: "!*()'"},
    _expectBody: ''
  },
  {
    _name: 'qs + json',
    qs: {rfc3986: "!*()'"},
    json: true,
    _expectBody: ''
  },
  {
    _name: 'form',
    form: {rfc3986: "!*()'"},
    _expectBody: bodyEscaped
  },
  {
    _name: 'form + json',
    form: {rfc3986: "!*()'"},
    json: true,
    _expectBody: bodyEscaped
  },
  {
    _name: 'qs + form',
    qs: {rfc3986: "!*()'"},
    form: {rfc3986: "!*()'"},
    _expectBody: bodyEscaped
  },
  {
    _name: 'qs + form + json',
    qs: {rfc3986: "!*()'"},
    form: {rfc3986: "!*()'"},
    json: true,
    _expectBody: bodyEscaped
  },
  {
    _name: 'body + header + json',
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: "rfc3986=!*()'",
    json: true,
    _expectBody: bodyEscaped
  },
  {
    _name: 'body + json',
    body: {rfc3986: "!*()'"},
    json: true,
    _expectBody: bodyJson
  },
  {
    _name: 'json object',
    json: {rfc3986: "!*()'"},
    _expectBody: bodyJson
  }
]

var libs = ['qs', 'querystring']

libs.forEach(function (lib) {
  cases.forEach(function (options) {
    options.useQuerystring = (lib === 'querystring')
    tape(lib + ' rfc3986 ' + options._name, function (t) {
      runTest(t, options)
    })
  })
})
