'use strict'

var server = require('./server')
  , request = require('../index')
  , events = require('events')
  , tape = require('tape')

var s = server.createServer()
  , ss = server.createSSLServer()
  , e = new events.EventEmitter()

function bouncy(s, serverUrl) {
  var redirs = { a: 'b'
               , b: 'c'
               , c: 'd'
               , d: 'e'
               , e: 'f'
               , f: 'g'
               , g: 'h'
               , h: 'end' }

  var perm = true
  Object.keys(redirs).forEach(function (p) {
    var t = redirs[p]

    // switch type each time
    var type = perm ? 301 : 302
    perm = !perm
    s.on('/' + p, function (req, res) {
      setTimeout(function() {
        res.writeHead(type, { location: serverUrl + '/' + t })
        res.end()
      }, Math.round(Math.random() * 25))
    })
  })

  s.on('/end', function (req, res) {
    var key = req.headers['x-test-key']
    e.emit('hit-' + key, key)
    res.writeHead(200)
    res.end(key)
  })
}

tape('setup', function(t) {
  s.listen(s.port, function() {
    bouncy(s, ss.url)
    ss.listen(ss.port, function() {
      bouncy(ss, s.url)
      t.end()
    })
  })
})

tape('lots of redirects', function(t) {
  var n = 10
  t.plan(n * 4)

  function doRedirect(i) {
    var key = 'test_' + i
    request({
      url: (i % 2 ? s.url : ss.url) + '/a',
      headers: { 'x-test-key': key },
      rejectUnauthorized: false
    }, function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, key)
    })

    e.once('hit-' + key, function(v) {
      t.equal(v, key)
    })
  }

  for (var i = 0; i < n; i++) {
    doRedirect(i)
  }
})

tape('cleanup', function(t) {
  s.close(function() {
    ss.close(function() {
      t.end()
    })
  })
})
