'use strict'

var request = require('../index')
  , http = require('http')
  , tape = require('tape')

var s = http.createServer(function (req, res) {
  res.statusCode = 200
  res.end('asdf')
})

tape('setup', function(t) {
  s.listen(6767, function() {
    t.end()
  })
})

tape('pool', function(t) {
  request({
    url: 'http://localhost:6767',
    pool: false
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'asdf')

    var agent = res.request.agent
    t.equal(agent, false)
    t.end()
  })
})

tape('forever', function(t) {
  var r = request({
    url: 'http://localhost:6767',
    forever: true,
    pool: {maxSockets: 1024}
  }, function(err, res, body) {
    // explicitly shut down the agent
    if (r.agent.destroy === typeof 'function') {
      r.agent.destroy()
    } else {
      // node < 0.12
      Object.keys(r.agent.sockets).forEach(function (name) {
        r.agent.sockets[name].forEach(function (socket) {
          socket.end()
        })
      })
    }

    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'asdf')

    var agent = res.request.agent
    t.equal(agent.maxSockets, 1024)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
