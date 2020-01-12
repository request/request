'use strict'

const http = require('http')
const request = require('../index')
const hawk = require('../lib/hawk')
const tape = require('tape')
const assert = require('assert')

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain'
  })
  res.end(authenticate(req))
})

tape('setup', (t) => {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

const creds = {
  key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
  algorithm: 'sha256',
  id: 'dh37fgj492je'
}

tape('hawk-get', (t) => {
  request(server.url, {
    hawk: { credentials: creds }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-post', (t) => {
  request.post({ url: server.url, body: 'hello', hawk: { credentials: creds, payload: 'hello' } }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-ext', (t) => {
  request(server.url, {
    hawk: { credentials: creds, ext: 'test' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-app', (t) => {
  request(server.url, {
    hawk: { credentials: creds, app: 'test' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-app+dlg', (t) => {
  request(server.url, {
    hawk: { credentials: creds, app: 'test', dlg: 'asd' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'OK')
    t.end()
  })
})

tape('hawk-missing-creds', (t) => {
  request(server.url, {
    hawk: {}
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-missing-creds-id', (t) => {
  request(server.url, {
    hawk: {
      credentials: {}
    }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-missing-creds-key', (t) => {
  request(server.url, {
    hawk: {
      credentials: { id: 'asd' }
    }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-missing-creds-algo', (t) => {
  request(server.url, {
    hawk: {
      credentials: { key: '123', id: '123' }
    }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('hawk-invalid-creds-algo', (t) => {
  request(server.url, {
    hawk: {
      credentials: { key: '123', id: '123', algorithm: 'xx' }
    }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'FAIL')
    t.end()
  })
})

tape('cleanup', (t) => {
  server.close(() => {
    t.end()
  })
})

function authenticate (req) {
  if (!req.headers.authorization) {
    return 'FAIL'
  }

  const headerParts = req.headers.authorization.match(/^(\w+)(?:\s+(.*))?$/)
  assert.equal(headerParts[1], 'Hawk')
  const attributes = {}
  headerParts[2].replace(/(\w+)="([^"\\]*)"\s*(?:,\s*|$)/g, ($0, $1, $2) => { attributes[$1] = $2 })
  const hostParts = req.headers.host.split(':')

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
  const credentials = {
    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
    algorithm: 'sha256',
    user: 'Steve'
  }

  const mac = hawk.calculateMac(credentials, artifacts)
  assert.equal(mac, attributes.mac)
  return 'OK'
}
