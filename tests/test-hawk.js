'use strict'

var http = require('http')
var request = require('../index')
var hawk = require('hawk')
var tape = require('tape')
var assert = require('assert')

var server = http.createServer(function (req, res) {
  var getCred = function (id, callback) {
    assert.equal(id, 'dh37fgj492je')
    var credentials = {
      key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
      algorithm: 'sha256',
      user: 'Steve'
    }
    return callback(null, credentials)
  }

  hawk.server.authenticate(req, getCred, {}, function (err, credentials, attributes) {
    res.writeHead(err ? 401 : 200, {
      'Content-Type': 'text/plain'
    })
    res.end(err ? 'Shoosh!' : 'Hello ' + credentials.user)
  })
})

tape('setup', function (t) {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('hawk', function (t) {
  var creds = {
    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
    algorithm: 'sha256',
    id: 'dh37fgj492je'
  }
  request(server.url, {
    hawk: { credentials: creds }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'Hello Steve')
    t.end()
  })
})

tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})
