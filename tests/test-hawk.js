'use strict'

var http = require('http')
var request = require('../index')
var hawk = require('../lib/hawk')
var tape = require('tape')
var assert = require('assert')

var server = http.createServer(function (req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })
  res.end(authenticate(req))
})

tape('setup', function (t) {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

var creds = {
  key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
  algorithm: 'sha256',
  id: 'dh37fgj492je'
}

tape('hawk-get', function (t) {
  request(server.url, {
    hawk: { credentials: creds }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-post', function (t) {
  request.post({ url: server.url, body: 'hello', hawk: { credentials: creds, payload: 'hello' } }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-ext', function (t) {
  request(server.url, {
    hawk: { credentials: creds, ext: 'test' }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-app', function (t) {
  request(server.url, {
    hawk: { credentials: creds, app: 'test' }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-app+dlg', function (t) {
  request(server.url, {
    hawk: { credentials: creds, app: 'test', dlg: 'asd' }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-missing-creds', function (t) {
  request(server.url, {
    hawk: {}
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-missing-creds-id', function (t) {
  request(server.url, {
    hawk: {
      credentials: {}
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-missing-creds-key', function (t) {
  request(server.url, {
    hawk: {
      credentials: { id: 'asd' }
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-missing-creds-algo', function (t) {
  request(server.url, {
    hawk: {
      credentials: { key: '123', id: '123' }
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-invalid-creds-algo', function (t) {
  request(server.url, {
    hawk: {
      credentials: { key: '123', id: '123', algorithm: 'xx' }
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})

function authenticate (req) {
  if (!req.headers.authorization) {
    return 'FAIL'
  }

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
  return 'OK'
}
