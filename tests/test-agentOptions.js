'use strict'

if (!process.env.running_under_istanbul) {
  // test-agent.js modifies the process state
  // causing these tests to fail when running under single process via tape

  const request = require('../index')
  const http = require('http')
  const server = require('./server')
  const tape = require('tape')

  var s = server.createServer()

  s.on('/', function (req, resp) {
    resp.statusCode = 200
    resp.end('')
  })

  tape('setup', t => {
    s.listen(0, () => {
      t.end()
    })
  })

  tape('without agentOptions should use global agent', t => {
    var r = request(s.url, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(r.agent, http.globalAgent)
      t.equal(Object.keys(r.pool).length, 0)
      t.end()
    })
  })

  tape('with agentOptions should apply to new agent in pool', t => {
    var r = request(s.url, {
      agentOptions: { foo: 'bar' }
    }, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(r.agent.options.foo, 'bar')
      t.equal(Object.keys(r.pool).length, 1)
      t.end()
    })
  })

  tape('cleanup', t => {
    s.close(() => {
      t.end()
    })
  })
}
