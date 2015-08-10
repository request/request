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

tape('forever, should use same agent in sequential requests', function(t) {
  var r = request.defaults({
    forever: true
  })
  var req1 = r('http://localhost:6767')
  var req2 = r('http://localhost:6767/somepath')
  req1.abort()
  req2.abort()
  if (typeof req1.agent.destroy === 'function') {
    req1.agent.destroy()
  }
  if (typeof req2.agent.destroy === 'function') {
    req2.agent.destroy()
  }
  t.equal(req1.agent, req2.agent)
  t.end()
})

tape('forever, should use same agent in sequential requests(with pool.maxSockets)', function(t) {
  var r = request.defaults({
    forever: true,
    pool: {maxSockets: 1024}
  })
  var req1 = r('http://localhost:6767')
  var req2 = r('http://localhost:6767/somepath')
  req1.abort()
  req2.abort()
  if (typeof req1.agent.destroy === 'function') {
    req1.agent.destroy()
  }
  if (typeof req2.agent.destroy === 'function') {
    req2.agent.destroy()
  }
  t.equal(req1.agent.maxSockets, 1024)
  t.equal(req1.agent, req2.agent)
  t.end()
})

tape('forever, should use same agent in request() and request.verb', function(t) {
  var r = request.defaults({
    forever: true,
    pool: {maxSockets: 1024}
  })
  var req1 = r('http://localhost:6767')
  var req2 = r.get('http://localhost:6767')
  req1.abort()
  req2.abort()
  if (typeof req1.agent.destroy === 'function') {
    req1.agent.destroy()
  }
  if (typeof req2.agent.destroy === 'function') {
    req2.agent.destroy()
  }
  t.equal(req1.agent.maxSockets, 1024)
  t.equal(req1.agent, req2.agent)
  t.end()
})

tape('should use different agent if pool option specified', function(t) {
  var r = request.defaults({
    forever: true,
    pool: {maxSockets: 1024}
  })
  var req1 = r('http://localhost:6767')
  var req2 = r.get({
    url: 'http://localhost:6767',
    pool: {maxSockets: 20}
  })
  req1.abort()
  req2.abort()
  if (typeof req1.agent.destroy === 'function') {
    req1.agent.destroy()
  }
  if (typeof req2.agent.destroy === 'function') {
    req2.agent.destroy()
  }
  t.equal(req1.agent.maxSockets, 1024)
  t.equal(req2.agent.maxSockets, 20)
  t.notEqual(req1.agent, req2.agent)
  t.end()
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
