'use strict'

// test-agent.js modifies the process state
// causing these tests to fail when running under single process via tape
if (!process.env.running_under_istanbul) {
  const request = require('../index')
  const http = require('http')
  const server = require('./server')
  const tape = require('tape')

  const s = server.createServer()

  s.on('/', function (req, resp) {
    resp.statusCode = 200
    resp.end('')
  })

  tape('setup', function (t) {
    s.listen(0, function () {
      t.end()
    })
  })

  tape('without agentOptions should use global agent', function (t) {
    const r = request(s.url, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(r.agent, http.globalAgent)
      t.equal(Object.keys(r.pool).length, 0)
      t.end()
    })
  })

  tape('with agentOptions should apply to new agent in pool', function (t) {
    const r = request(s.url, {
      agentOptions: { foo: 'bar' }
    }, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(r.agent.options.foo, 'bar')
      t.equal(Object.keys(r.pool).length, 1)
      t.end()
    })
  })

  tape('cleanup', function (t) {
    s.close(function () {
      t.end()
    })
  })
}
