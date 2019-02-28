'use strict'

// this also validates that for each configuration new Agent is created
// previously same Agent was re-used on passphrase change

var server = require('./server')
var request = require('../index')
var fs = require('fs')
var path = require('path')
var tape = require('tape')

var caPath = path.resolve(__dirname, 'ssl/ca/ca.crt')
var ca = fs.readFileSync(caPath)
var clientPfx = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client.pfx'))
var clientKey = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client.key'))
var clientCert = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client.crt'))
var clientKeyEnc = fs.readFileSync(path.resolve(__dirname, 'ssl/ca/client-enc.key'))
var clientPassword = 'password'

var sslServer = server.createSSLServer({
  key: path.resolve(__dirname, 'ssl/ca/localhost.key'),
  cert: path.resolve(__dirname, 'ssl/ca/localhost.crt'),
  ca: caPath,
  requestCert: true,
  rejectUnauthorized: true
})

tape('setup', function (t) {
  sslServer.on('/', function (req, res) {
    if (req.client.authorized) {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('authorized')
    } else {
      res.writeHead(401, { 'Content-Type': 'text/plain' })
      res.end('unauthorized')
    }
  })

  sslServer.listen(0, function () {
    t.end()
  })
})

tape('key + cert', function (t) {
  request({
    url: sslServer.url,
    ca: ca,
    key: clientKey,
    cert: clientCert
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'authorized')
    t.end()
  })
})

tape('key + cert + passphrase', function (t) {
  request({
    url: sslServer.url,
    ca: ca,
    key: clientKeyEnc,
    cert: clientCert,
    passphrase: clientPassword
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'authorized')
    t.end()
  })
})

tape('key + cert + passphrase(invalid)', function (t) {
  request({
    url: sslServer.url,
    ca: ca,
    key: clientKeyEnc,
    cert: clientCert,
    passphrase: 'invalidPassphrase'
  }, function (err, res, body) {
    t.ok(err)
    t.end()
  })
})

tape('pfx + passphrase', function (t) {
  request({
    url: sslServer.url,
    ca: ca,
    pfx: clientPfx,
    passphrase: clientPassword
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'authorized')
    t.end()
  })
})

tape('pfx + passphrase(invalid)', function (t) {
  request({
    url: sslServer.url,
    ca: ca,
    pfx: clientPfx,
    passphrase: 'invalidPassphrase'
  }, function (err, res, body) {
    t.ok(err)
    t.end()
  })
})

tape('extraCA(enabled)', function (t) {
  // enable extraCA support
  request.enableNodeExtraCACerts();

  request({
    url: sslServer.url,
    extraCA: ca,
    key: clientKey,
    cert: clientCert
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.toString(), 'authorized')
    request.disableNodeExtraCACerts()
    t.end()
  })
})

tape('extraCA(disabled)', function (t) {
  request({
    url: sslServer.url,
    extraCA: ca,
    key: clientKey,
    cert: clientCert
  }, function (err, res, body) {
    t.ok(err)
    t.end()
  })
})

tape('cleanup', function (t) {
  sslServer.close(function () {
    t.end()
  })
})
