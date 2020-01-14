'use strict'

// test-agent.js modifies the process state
// causing these tests to fail when running under single process via tape
if (!process.env.running_under_istanbul) {
  const request = require('../index')
  const http = require('http')
  const server = require('./server')
  const tape = require('tape')

  const s = server.createServer()

  s.on('/', (req, resp) => {
    resp.statusCode = 200
    resp.end('')
  })

  tape('setup', t => {
    s.listen(0, () => {
      t.end()
    })
  })

  tape('without agentOptions should use global agent', t => {
    const r = request(s.url, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(r.agent, http.globalAgent)
      t.equal(Object.keys(r.pool).length, 0)
      t.end()
    })
  })

  tape('with agentOptions should apply to new agent in pool', t => {
    const r = request(
      s.url,
      {
        agentOptions: { foo: 'bar' }
      },
      (err, res, body) => {
        t.equal(err, null)
        t.equal(res.statusCode, 200)
        t.equal(r.agent.options.foo, 'bar')
        t.equal(Object.keys(r.pool).length, 1)
        t.end()
      }
    )
  })

  tape('cleanup', t => {
    s.close(() => {
      t.end()
    })
  })
}
