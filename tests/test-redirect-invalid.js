'use strict'

var server = require('./server')
var request = require('../index')
var tape = require('tape')
var destroyable = require('server-destroy')

var s = server.createServer()
var hits = {}

destroyable(s)

function bouncer (label, target) {
  s.on('/' + label, function (req, res) {
    hits[label] = true
    res.writeHead(301, {
      'location': target
    })
    res.end()
  })
}

tape('setup', function (t) {
  s.listen(0, function () {
    bouncer('bad', 'http://%ED%A0%BD@foo/')
    t.end()
  })
})

tape('invalid bounce', function (t) {
  hits = {}
  request({
    uri: s.url + '/bad'
  }, function (err, res, body) {
    t.ok(err.startsWith('URIError:'), 'Got URIError')
    t.ok(hits.bad, 'Original request is to /bad')
    t.end()
  })
})

tape('cleanup', function (t) {
  s.destroy(function () {
    t.end()
  })
})
