'use strict'

const request = require('../index')
const version = require('../lib/helpers').version
const http = require('http')
const ForeverAgent = require('forever-agent')
const tape = require('tape')

const s = http.createServer(function (req, res) {
  res.statusCode = 200
  res.end()
})

tape('setup', function (t) {
  s.listen(0, function () {
    s.port = this.address().port
    s.url = 'http://localhost:' + s.port
    t.end()
  })
})

function httpAgent (t, options, req) {
  const r = (req || request)(options, function (_err, res, body) {
    t.ok(r.agent instanceof http.Agent, 'is http.Agent')
    t.equal(r.agent.options.keepAlive, true, 'is keepAlive')
    t.equal(Object.keys(r.agent.sockets).length, 1, '1 socket name')

    const name = (typeof r.agent.getName === 'function')
      ? r.agent.getName({ port: s.port })
      : 'localhost:' + s.port // node 0.10-
    t.equal(r.agent.sockets[name].length, 1, '1 open socket')

    const socket = r.agent.sockets[name][0]
    socket.on('close', function () {
      t.equal(Object.keys(r.agent.sockets).length, 0, '0 open sockets')
      t.end()
    })
    socket.end()
  })
}

function foreverAgent (t, options, req) {
  const r = (req || request)(options, function (_err, res, body) {
    t.ok(r.agent instanceof ForeverAgent, 'is ForeverAgent')
    t.equal(Object.keys(r.agent.sockets).length, 1, '1 socket name')

    const name = 'localhost:' + s.port // node 0.10-
    t.equal(r.agent.sockets[name].length, 1, '1 open socket')

    const socket = r.agent.sockets[name][0]
    socket.on('close', function () {
      t.equal(Object.keys(r.agent.sockets[name]).length, 0, '0 open sockets')
      t.end()
    })
    socket.end()
  })
}

// http.Agent

tape('options.agent', function (t) {
  httpAgent(t, {
    uri: s.url,
    agent: new http.Agent({ keepAlive: true })
  })
})

tape('options.agentClass + options.agentOptions', function (t) {
  httpAgent(t, {
    uri: s.url,
    agentClass: http.Agent,
    agentOptions: { keepAlive: true }
  })
})

// forever-agent

tape('options.forever = true', function (t) {
  const v = version()
  const options = {
    uri: s.url,
    forever: true
  }

  if (v.major === 0 && v.minor <= 10) { foreverAgent(t, options) } else { httpAgent(t, options) }
})

tape('forever() method', function (t) {
  const v = version()
  const options = {
    uri: s.url
  }
  const r = request.forever({ maxSockets: 1 })

  if (v.major === 0 && v.minor <= 10) { foreverAgent(t, options, r) } else { httpAgent(t, options, r) }
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
