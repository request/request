'use strict'

const server = require('./server')
let request = require('../index')
const util = require('util')
const tape = require('tape')
const destroyable = require('server-destroy')

const s = server.createServer()
const ss = server.createSSLServer()

destroyable(s)
destroyable(ss)

// always send basic auth and allow non-strict SSL
request = request.defaults({
  auth: {
    user: 'test',
    pass: 'testing'
  },
  rejectUnauthorized: false
})

// redirect.from(proto, host).to(proto, host) returns an object with keys:
//   src : source URL
//   dst : destination URL
const redirect = {
  from: (fromProto, fromHost) => {
    return {
      to: (toProto, toHost) => {
        const fromPort = (fromProto === 'http' ? s.port : ss.port)
        const toPort = (toProto === 'http' ? s.port : ss.port)
        return {
          src: util.format(
            '%s://%s:%d/to/%s/%s',
            fromProto, fromHost, fromPort, toProto, toHost),
          dst: util.format(
            '%s://%s:%d/from/%s/%s',
            toProto, toHost, toPort, fromProto, fromHost)
        }
      }
    }
  }
}

function handleRequests (srv) {
  ['http', 'https'].forEach((proto) => {
    ['localhost', '127.0.0.1'].forEach((host) => {
      srv.on(util.format('/to/%s/%s', proto, host), (req, res) => {
        const r = redirect
          .from(srv.protocol, req.headers.host.split(':')[0])
          .to(proto, host)
        res.writeHead(301, {
          location: r.dst
        })
        res.end()
      })

      srv.on(util.format('/from/%s/%s', proto, host), (req, res) => {
        res.end('auth: ' + (req.headers.authorization || '(nothing)'))
      })
    })
  })
}

handleRequests(s)
handleRequests(ss)

function runTest (name, redir, expectAuth) {
  tape('redirect to ' + name, (t) => {
    request(redir.src, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.request.uri.href, redir.dst)
      t.equal(res.statusCode, 200)
      t.equal(body, expectAuth
        ? 'auth: Basic dGVzdDp0ZXN0aW5n'
        : 'auth: (nothing)')
      t.end()
    })
  })
}

function addTests () {
  runTest('same host and protocol',
    redirect.from('http', 'localhost').to('http', 'localhost'),
    true)

  runTest('same host different protocol',
    redirect.from('http', 'localhost').to('https', 'localhost'),
    true)

  runTest('different host same protocol',
    redirect.from('https', '127.0.0.1').to('https', 'localhost'),
    false)

  runTest('different host and protocol',
    redirect.from('http', 'localhost').to('https', '127.0.0.1'),
    false)
}

tape('setup', (t) => {
  s.listen(0, () => {
    ss.listen(0, () => {
      addTests()
      tape('cleanup', (t) => {
        s.destroy(() => {
          ss.destroy(() => {
            t.end()
          })
        })
      })
      t.end()
    })
  })
})

tape('redirect URL helper', (t) => {
  t.deepEqual(
    redirect.from('http', 'localhost').to('https', '127.0.0.1'),
    {
      src: util.format('http://localhost:%d/to/https/127.0.0.1', s.port),
      dst: util.format('https://127.0.0.1:%d/from/http/localhost', ss.port)
    })
  t.deepEqual(
    redirect.from('https', 'localhost').to('http', 'localhost'),
    {
      src: util.format('https://localhost:%d/to/http/localhost', ss.port),
      dst: util.format('http://localhost:%d/from/https/localhost', s.port)
    })
  t.end()
})
