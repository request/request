'use strict'

var server = require('./server')
  , tape = require('tape')
  , request = require('../index')
  , https = require('https')
  , net = require('net')
  , fs = require('fs')
  , path = require('path')
  , util = require('util')
  , url = require('url')
  , destroyable = require('server-destroy')

var events = []
  , caFile = path.resolve(__dirname, 'ssl/ca/ca.crt')
  , ca = fs.readFileSync(caFile)
  , clientCert = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client.crt'))
  , clientKey = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client-enc.key'))
  , clientPassword = 'password'
  , sslOpts = {
    key  : path.resolve(__dirname, 'ssl/ca/localhost.key'),
    cert : path.resolve(__dirname, 'ssl/ca/localhost.crt'),
  }
  , mutualSSLOpts = {
    key  : path.resolve(__dirname, 'ssl/ca/localhost.key'),
    cert : path.resolve(__dirname, 'ssl/ca/localhost.crt'),
    ca: caFile,
    requestCert: true,
    rejectUnauthorized: true
  }

var httpsOpts = https.globalAgent.options
httpsOpts.ca = httpsOpts.ca || []
httpsOpts.ca.push(ca)

var s = server.createServer()
  , ss = server.createSSLServer(null, sslOpts)
  , sss = server.createSSLServer(ss.port + 1, mutualSSLOpts)

// XXX when tunneling https over https, connections get left open so the server
// doesn't want to close normally (and same issue with http server on v0.8.x)
destroyable(s)
destroyable(ss)
destroyable(sss)

function event() {
  events.push(util.format.apply(null, arguments))
}

function setListeners(server, type) {
  server.on('/', function(req, res) {
    event('%s response', type)
    res.end(type + ' ok')
  })

  server.on(s.url + '/', function(req, res) {
    event('%s proxy to http', type)
    request(s.url).pipe(res)
  })

  server.on(ss.url + '/', function(req, res) {
    event('%s proxy to https', type)
    request(ss.url).pipe(res)
  })

  server.on('connect', function(req, client, head) {
    var u = url.parse(req.url)
    var server = net.connect(u.host, u.port, function() {
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
setListeners(sss, 'https')

tape('setup', function(t) {
  s.listen(s.port, function() {
    ss.listen(ss.port, function() {
      sss.listen(sss.port, 'localhost', function() {
        t.end();
      })
    })
  })
})

// monkey-patch since you can't set a custom certificate authority for the
// proxy in tunnel-agent (this is necessary for "* over https" tests)
var customCaCount = 0
var httpsRequestOld = https.request
https.request = function(options) {
  if (customCaCount) {
    options.ca = ca
    customCaCount--
  }
  return httpsRequestOld.apply(this, arguments)
}

function runTest(name, opts, expected) {
  tape(name, function(t) {
    opts.ca = ca
    if (opts.proxy === ss.url) {
      customCaCount = (opts.url === ss.url ? 2 : 1)
    }
    request(opts, function(err, res, body) {
      event(err ? 'err ' + err.message : res.statusCode + ' ' + body)
      t.deepEqual(events, expected)
      events = []
      t.end()
    })
  })
}


// HTTP OVER HTTP TESTS

runTest('http over http, tunnel=true', {
  url    : s.url,
  proxy  : s.url,
  tunnel : true
}, [
  'http connect to localhost:' + s.port,
  'http response',
  '200 http ok'
])

runTest('http over http, tunnel=false', {
  url    : s.url,
  proxy  : s.url,
  tunnel : false
}, [
  'http proxy to http',
  'http response',
  '200 http ok'
])

runTest('http over http, tunnel=default', {
  url    : s.url,
  proxy  : s.url
}, [
  'http proxy to http',
  'http response',
  '200 http ok'
])


// HTTP OVER HTTPS TESTS

runTest('http over https, tunnel=true', {
  url    : s.url,
  proxy  : ss.url,
  tunnel : true
}, [
  'https connect to localhost:' + s.port,
  'http response',
  '200 http ok'
])

runTest('http over https, tunnel=false', {
  url    : s.url,
  proxy  : ss.url,
  tunnel : false
}, [
  'https proxy to http',
  'http response',
  '200 http ok'
])

runTest('http over https, tunnel=default', {
  url    : s.url,
  proxy  : ss.url
}, [
  'https proxy to http',
  'http response',
  '200 http ok'
])


// HTTPS OVER HTTP TESTS

runTest('https over http, tunnel=true', {
  url    : ss.url,
  proxy  : s.url,
  tunnel : true
}, [
  'http connect to localhost:' + ss.port,
  'https response',
  '200 https ok'
])

runTest('https over http, tunnel=false', {
  url    : ss.url,
  proxy  : s.url,
  tunnel : false // currently has no effect
}, [
  'http connect to localhost:' + ss.port,
  'https response',
  '200 https ok'
])

runTest('https over http, tunnel=default', {
  url    : ss.url,
  proxy  : s.url
}, [
  'http connect to localhost:' + ss.port,
  'https response',
  '200 https ok'
])

// MUTUAL HTTPS OVER HTTP TESTS

runTest('mutual https over http, tunnel=true', {
  url    : sss.url,
  proxy  : s.url,
  tunnel : true,
  cert: clientCert,
  key: clientKey,
  passphrase: clientPassword
}, [
  'http connect to localhost:' + sss.port,
  'https response',
  '200 https ok'
])

runTest('mutual https over http, tunnel=false', {
  url    : sss.url,
  proxy  : s.url,
  tunnel : false, // currently has no effect
  cert: clientCert,
  key: clientKey,
  passphrase: clientPassword
}, [
  'http connect to localhost:' + sss.port,
  'https response',
  '200 https ok'
])

runTest('mutual https over http, tunnel=default', {
  url    : sss.url,
  proxy  : s.url,
  cert: clientCert,
  key: clientKey,
  passphrase: clientPassword
}, [
  'http connect to localhost:' + sss.port,
  'https response',
  '200 https ok'
])

// HTTPS OVER HTTPS TESTS

runTest('https over https, tunnel=true', {
  url    : ss.url,
  proxy  : ss.url,
  tunnel : true
}, [
  'https connect to localhost:' + ss.port,
  'https response',
  '200 https ok'
])

runTest('https over https, tunnel=false', {
  url    : ss.url,
  proxy  : ss.url,
  tunnel : false // currently has no effect
}, [
  'https connect to localhost:' + ss.port,
  'https response',
  '200 https ok'
])

runTest('https over https, tunnel=default', {
  url    : ss.url,
  proxy  : ss.url
}, [
  'https connect to localhost:' + ss.port,
  'https response',
  '200 https ok'
])


tape('cleanup', function(t) {
  s.destroy(function() {
    ss.destroy(function() {
      sss.destroy(function() {
        t.end();
      })
    })
  })
})
