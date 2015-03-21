'use strict'

var http = require('http')
  , https = require('https')
  , server = require('./server')
  , request = require('../index')
  , tape = require('tape')

var faux_requests_made

function clear_faux_requests() {
  faux_requests_made = { http: 0, https: 0 }
}

function wrap_request(name, module) {
  // Just like the http or https module, but note when a request is made.
  var wrapped = {}
  Object.keys(module).forEach(function(key) {
    var value = module[key]

    if (key === 'request') {
      wrapped[key] = function(/*options, callback*/) {
        faux_requests_made[name] += 1
        return value.apply(this, arguments)
      }
    } else {
      wrapped[key] = value
    }
  })

  return wrapped
}

var faux_http = wrap_request('http', http)
  , faux_https = wrap_request('https', https)
  , plain_server = server.createServer()
  , https_server = server.createSSLServer()

tape('setup', function(t) {
  plain_server.listen(plain_server.port, function() {
    plain_server.on('/plain', function (req, res) {
      res.writeHead(200)
      res.end('plain')
    })
    plain_server.on('/to_https', function (req, res) {
      res.writeHead(301, { 'location': 'https://localhost:' + https_server.port + '/https' })
      res.end()
    })

    https_server.listen(https_server.port, function() {
      https_server.on('/https', function (req, res) {
        res.writeHead(200)
        res.end('https')
      })
      https_server.on('/to_plain', function (req, res) {
        res.writeHead(302, { 'location': 'http://localhost:' + plain_server.port + '/plain' })
        res.end()
      })

      t.end()
    })
  })
})

function run_tests(name, httpModules) {
  tape(name, function(t) {
    var to_https = 'http://localhost:' + plain_server.port + '/to_https'
      , to_plain = 'https://localhost:' + https_server.port + '/to_plain'
      , options = { httpModules: httpModules, strictSSL: false }
      , modulesTest = httpModules || {}

    clear_faux_requests()

    request(to_https, options, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'https', 'Received HTTPS server body')

      t.equal(faux_requests_made.http,  modulesTest['http:' ] ? 1 : 0)
      t.equal(faux_requests_made.https, modulesTest['https:'] ? 1 : 0)

      request(to_plain, options, function (err, res, body) {
        t.equal(err, null)
        t.equal(res.statusCode, 200)
        t.equal(body, 'plain', 'Received HTTPS server body')

        t.equal(faux_requests_made.http,  modulesTest['http:' ] ? 2 : 0)
        t.equal(faux_requests_made.https, modulesTest['https:'] ? 2 : 0)

        t.end()
      })
    })
  })
}

run_tests('undefined')
run_tests('empty', {})
run_tests('http only', { 'http:': faux_http })
run_tests('https only', { 'https:': faux_https })
run_tests('http and https', { 'http:': faux_http, 'https:': faux_https })

tape('cleanup', function(t) {
  plain_server.close(function() {
    https_server.close(function() {
      t.end()
    })
  })
})
