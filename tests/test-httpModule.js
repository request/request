'use strict'

const http = require('http')
const https = require('https')
const destroyable = require('server-destroy')
const server = require('./server')
const request = require('../index')
const tape = require('tape')

var fauxRequestsMade

function clearFauxRequests () {
  fauxRequestsMade = { http: 0, https: 0 }
}

function wrapRequest (name, module) {
  // Just like the http or https module, but note when a request is made.
  var wrapped = {}
  Object.keys(module).forEach(function (key) {
    var value = module[key]

    if (key === 'request') {
      wrapped[key] = function (/* options, callback */) {
        fauxRequestsMade[name] += 1
        return value.apply(this, arguments)
      }
    } else {
      wrapped[key] = value
    }
  })

  return wrapped
}

let fauxHttp = wrapRequest('http', http)
let fauxHttps = wrapRequest('https', https)
let plainServer = server.createServer()
let httpsServer = server.createSSLServer()

destroyable(plainServer)
destroyable(httpsServer)

tape('setup', function (t) {
  plainServer.listen(0, function () {
    plainServer.on('/plain', function (req, res) {
      res.writeHead(200)
      res.end('plain')
    })
    plainServer.on('/toHttps', function (req, res) {
      res.writeHead(301, { 'location': 'https://localhost:' + httpsServer.port + '/https' })
      res.end()
    })

    httpsServer.listen(0, function () {
      httpsServer.on('/https', function (req, res) {
        res.writeHead(200)
        res.end('https')
      })
      httpsServer.on('/toPlain', function (req, res) {
        res.writeHead(302, { 'location': 'http://localhost:' + plainServer.port + '/plain' })
        res.end()
      })

      t.end()
    })
  })
})

function runTests (name, httpModules) {
  tape(name, function (t) {
    let toHttps = 'http://localhost:' + plainServer.port + '/toHttps'
    let toPlain = 'https://localhost:' + httpsServer.port + '/toPlain'
    let options = { httpModules: httpModules, strictSSL: false }
    let modulesTest = httpModules || {}

    clearFauxRequests()

    request(toHttps, options, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'https', 'Received HTTPS server body')

      t.equal(fauxRequestsMade.http, modulesTest['http:'] ? 1 : 0)
      t.equal(fauxRequestsMade.https, modulesTest['https:'] ? 1 : 0)

      request(toPlain, options, function (err, res, body) {
        t.equal(err, null)
        t.equal(res.statusCode, 200)
        t.equal(body, 'plain', 'Received HTTPS server body')

        t.equal(fauxRequestsMade.http, modulesTest['http:'] ? 2 : 0)
        t.equal(fauxRequestsMade.https, modulesTest['https:'] ? 2 : 0)

        t.end()
      })
    })
  })
}

runTests('undefined')
runTests('empty', {})
runTests('http only', { 'http:': fauxHttp })
runTests('https only', { 'https:': fauxHttps })
runTests('http and https', { 'http:': fauxHttp, 'https:': fauxHttps })

tape('cleanup', function (t) {
  plainServer.destroy(function () {
    httpsServer.destroy(function () {
      t.end()
    })
  })
})
