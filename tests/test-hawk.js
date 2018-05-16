'use strict'

var http = require('http')
var request = require('../index')
var hawk = require('../lib/hawk')
var tape = require('tape')
var assert = require('assert')

var server = http.createServer(function (req, res) {
  var user = authenticate(req)
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })
  res.end('Hello ' + user)
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

function authenticate (req) {
  var headerParts = req.headers.authorization.match(/^(\w+)(?:\s+(.*))?$/)
  assert.equal(headerParts[1], 'Hawk')
  var attributes = {}
  headerParts[2].replace(/(\w+)="([^"\\]*)"\s*(?:,\s*|$)/g, function ($0, $1, $2) { attributes[$1] = $2 })
  var hostParts = req.headers.host.split(':')

  const artifacts = {
    method: req.method,
    host: hostParts[0],
    port: (hostParts[1] ? hostParts[1] : (req.connection && req.connection.encrypted ? 443 : 80)),
    resource: req.url,
    ts: attributes.ts,
    nonce: attributes.nonce,
    hash: attributes.hash,
    ext: attributes.ext,
    app: attributes.app,
    dlg: attributes.dlg,
    mac: attributes.mac,
    id: attributes.id
  }

  assert.equal(attributes.id, 'dh37fgj492je')
  var credentials = {
    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
    algorithm: 'sha256',
    user: 'Steve'
  }

  const mac = hawk.calculateMac(credentials, artifacts)
  assert.equal(mac, attributes.mac)
  return credentials.user
}
