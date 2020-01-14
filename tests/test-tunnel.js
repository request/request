'use strict'

const server = require('./server')
const tape = require('tape')
const request = require('../index')
const https = require('https')
const net = require('net')
const fs = require('fs')
const path = require('path')
const util = require('util')
const destroyable = require('server-destroy')

let events = []
const caFile = path.resolve(__dirname, 'ssl/ca/ca.crt')
const ca = fs.readFileSync(caFile)
const clientCert = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client.crt'))
const clientKey = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client-enc.key'))
const clientPassword = 'password'
const sslOpts = {
  key: path.resolve(__dirname, 'ssl/ca/localhost.key'),
  cert: path.resolve(__dirname, 'ssl/ca/localhost.crt')
}

const mutualSSLOpts = {
  key: path.resolve(__dirname, 'ssl/ca/localhost.key'),
  cert: path.resolve(__dirname, 'ssl/ca/localhost.crt'),
  ca: caFile,
  requestCert: true,
  rejectUnauthorized: true
}

// this is needed for 'https over http, tunnel=false' test
// from https://github.com/coolaj86/node-ssl-root-cas/blob/v1.1.9-beta/ssl-root-cas.js#L4267-L4281
const httpsOpts = https.globalAgent.options
httpsOpts.ca = httpsOpts.ca || []
httpsOpts.ca.push(ca)

const s = server.createServer()
const ss = server.createSSLServer(sslOpts)
const ss2 = server.createSSLServer(mutualSSLOpts)

// XXX when tunneling https over https, connections get left open so the server
// doesn't want to close normally (and same issue with http server on v0.8.x)
destroyable(s)
destroyable(ss)
destroyable(ss2)

function event () {
  events.push(util.format.apply(null, arguments))
}

function setListeners (server, type) {
  server.on('/', (req, res) => {
    event('%s response', type)
    res.end(type + ' ok')
  })

  server.on('request', (req, res) => {
    if (/^https?:/.test(req.url)) {
      // This is a proxy request
      let dest = req.url.split(':')[0]
      // Is it a redirect?
      const match = req.url.match(/\/redirect\/(https?)$/)
      if (match) {
        dest += '->' + match[1]
      }
      event('%s proxy to %s', type, dest)
      request(req.url, { followRedirect: false }).pipe(res)
    }
  })

  server.on('/redirect/http', (req, res) => {
    event('%s redirect to http', type)
    res.writeHead(301, {
      location: s.url
    })
    res.end()
  })

  server.on('/redirect/https', (req, res) => {
    event('%s redirect to https', type)
    res.writeHead(301, {
      location: ss.url
    })
    res.end()
  })

  server.on('connect', (req, client, head) => {
    const [, port] = req.url.split(':')
    const server = net.connect(port, () => {
      event('%s connect to %s', type, req.url)
      client.write('HTTP/1.1 200 Connection established\r\n\r\n')
      client.pipe(server)
      server.write(head)
      server.pipe(client)
    })
  })
}

setListeners(s, 'http')
setListeners(ss, 'https')
setListeners(ss2, 'https')

// monkey-patch since you can't set a custom certificate authority for the
// proxy in tunnel-agent (this is necessary for "* over https" tests)
let customCaCount = 0
const httpsRequestOld = https.request
https.request = function (options) {
  if (customCaCount) {
    options.ca = ca
    customCaCount--
  }
  return httpsRequestOld.apply(this, arguments)
}

function runTest (name, opts, expected) {
  tape(name, (t) => {
    opts.ca = ca
    if (opts.proxy === ss.url) {
      customCaCount = (opts.url === ss.url ? 2 : 1)
    }
    request(opts, (err, res, body) => {
      event(err ? 'err ' + err.message : res.statusCode + ' ' + body)
      t.deepEqual(events, expected)
      events = []
      t.end()
    })
  })
}

function addTests () {
  // HTTP OVER HTTP

  runTest('http over http, tunnel=true', {
    url: s.url,
    proxy: s.url,
    tunnel: true
  }, [
    'http connect to localhost:' + s.port,
    'http response',
    '200 http ok'
  ])

  runTest('http over http, tunnel=false', {
    url: s.url,
    proxy: s.url,
    tunnel: false
  }, [
    'http proxy to http',
    'http response',
    '200 http ok'
  ])

  runTest('http over http, tunnel=default', {
    url: s.url,
    proxy: s.url
  }, [
    'http proxy to http',
    'http response',
    '200 http ok'
  ])

  // HTTP OVER HTTPS

  runTest('http over https, tunnel=true', {
    url: s.url,
    proxy: ss.url,
    tunnel: true
  }, [
    'https connect to localhost:' + s.port,
    'http response',
    '200 http ok'
  ])

  runTest('http over https, tunnel=false', {
    url: s.url,
    proxy: ss.url,
    tunnel: false
  }, [
    'https proxy to http',
    'http response',
    '200 http ok'
  ])

  runTest('http over https, tunnel=default', {
    url: s.url,
    proxy: ss.url
  }, [
    'https proxy to http',
    'http response',
    '200 http ok'
  ])

  // HTTPS OVER HTTP

  runTest('https over http, tunnel=true', {
    url: ss.url,
    proxy: s.url,
    tunnel: true
  }, [
    'http connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  runTest('https over http, tunnel=false', {
    url: ss.url,
    proxy: s.url,
    tunnel: false
  }, [
    'http proxy to https',
    'https response',
    '200 https ok'
  ])

  runTest('https over http, tunnel=default', {
    url: ss.url,
    proxy: s.url
  }, [
    'http connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  // HTTPS OVER HTTPS

  runTest('https over https, tunnel=true', {
    url: ss.url,
    proxy: ss.url,
    tunnel: true
  }, [
    'https connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  runTest('https over https, tunnel=false', {
    url: ss.url,
    proxy: ss.url,
    tunnel: false,
    pool: false // must disable pooling here or Node.js hangs
  }, [
    'https proxy to https',
    'https response',
    '200 https ok'
  ])

  runTest('https over https, tunnel=default', {
    url: ss.url,
    proxy: ss.url
  }, [
    'https connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  // HTTP->HTTP OVER HTTP

  runTest('http->http over http, tunnel=true', {
    url: s.url + '/redirect/http',
    proxy: s.url,
    tunnel: true
  }, [
    'http connect to localhost:' + s.port,
    'http redirect to http',
    'http connect to localhost:' + s.port,
    'http response',
    '200 http ok'
  ])

  runTest('http->http over http, tunnel=false', {
    url: s.url + '/redirect/http',
    proxy: s.url,
    tunnel: false
  }, [
    'http proxy to http->http',
    'http redirect to http',
    'http proxy to http',
    'http response',
    '200 http ok'
  ])

  runTest('http->http over http, tunnel=default', {
    url: s.url + '/redirect/http',
    proxy: s.url
  }, [
    'http proxy to http->http',
    'http redirect to http',
    'http proxy to http',
    'http response',
    '200 http ok'
  ])

  // HTTP->HTTPS OVER HTTP

  runTest('http->https over http, tunnel=true', {
    url: s.url + '/redirect/https',
    proxy: s.url,
    tunnel: true
  }, [
    'http connect to localhost:' + s.port,
    'http redirect to https',
    'http connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  runTest('http->https over http, tunnel=false', {
    url: s.url + '/redirect/https',
    proxy: s.url,
    tunnel: false
  }, [
    'http proxy to http->https',
    'http redirect to https',
    'http proxy to https',
    'https response',
    '200 https ok'
  ])

  runTest('http->https over http, tunnel=default', {
    url: s.url + '/redirect/https',
    proxy: s.url
  }, [
    'http proxy to http->https',
    'http redirect to https',
    'http connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  // HTTPS->HTTP OVER HTTP

  runTest('https->http over http, tunnel=true', {
    url: ss.url + '/redirect/http',
    proxy: s.url,
    tunnel: true
  }, [
    'http connect to localhost:' + ss.port,
    'https redirect to http',
    'http connect to localhost:' + s.port,
    'http response',
    '200 http ok'
  ])

  runTest('https->http over http, tunnel=false', {
    url: ss.url + '/redirect/http',
    proxy: s.url,
    tunnel: false
  }, [
    'http proxy to https->http',
    'https redirect to http',
    'http proxy to http',
    'http response',
    '200 http ok'
  ])

  runTest('https->http over http, tunnel=default', {
    url: ss.url + '/redirect/http',
    proxy: s.url
  }, [
    'http connect to localhost:' + ss.port,
    'https redirect to http',
    'http proxy to http',
    'http response',
    '200 http ok'
  ])

  // HTTPS->HTTPS OVER HTTP

  runTest('https->https over http, tunnel=true', {
    url: ss.url + '/redirect/https',
    proxy: s.url,
    tunnel: true
  }, [
    'http connect to localhost:' + ss.port,
    'https redirect to https',
    'http connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  runTest('https->https over http, tunnel=false', {
    url: ss.url + '/redirect/https',
    proxy: s.url,
    tunnel: false
  }, [
    'http proxy to https->https',
    'https redirect to https',
    'http proxy to https',
    'https response',
    '200 https ok'
  ])

  runTest('https->https over http, tunnel=default', {
    url: ss.url + '/redirect/https',
    proxy: s.url
  }, [
    'http connect to localhost:' + ss.port,
    'https redirect to https',
    'http connect to localhost:' + ss.port,
    'https response',
    '200 https ok'
  ])

  // MUTUAL HTTPS OVER HTTP

  runTest('mutual https over http, tunnel=true', {
    url: ss2.url,
    proxy: s.url,
    tunnel: true,
    cert: clientCert,
    key: clientKey,
    passphrase: clientPassword
  }, [
    'http connect to localhost:' + ss2.port,
    'https response',
    '200 https ok'
  ])

  // XXX causes 'Error: socket hang up'
  // runTest('mutual https over http, tunnel=false', {
  //   url        : ss2.url,
  //   proxy      : s.url,
  //   tunnel     : false,
  //   cert       : clientCert,
  //   key        : clientKey,
  //   passphrase : clientPassword
  // }, [
  //   'http connect to localhost:' + ss2.port,
  //   'https response',
  //   '200 https ok'
  // ])

  runTest('mutual https over http, tunnel=default', {
    url: ss2.url,
    proxy: s.url,
    cert: clientCert,
    key: clientKey,
    passphrase: clientPassword
  }, [
    'http connect to localhost:' + ss2.port,
    'https response',
    '200 https ok'
  ])
}

tape('setup', (t) => {
  s.listen(0, () => {
    ss.listen(0, () => {
      ss2.listen(0, 'localhost', () => {
        addTests()
        tape('cleanup', (t) => {
          s.destroy(() => {
            ss.destroy(() => {
              ss2.destroy(() => {
                t.end()
              })
            })
          })
        })
        t.end()
      })
    })
  })
})
