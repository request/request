'use strict'

const request = require('../index')
const http = require('http')
const tape = require('tape')

const s = http.createServer((req, res) => {
  res.statusCode = 200
  res.end('asdf')
})

tape('setup', t => {
  s.listen(0, function () {
    s.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('pool', t => {
  request(
    {
      url: s.url,
      pool: false
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'asdf')

      const agent = res.request.agent
      t.equal(agent, false)
      t.end()
    }
  )
})

tape('forever', t => {
  const r = request(
    {
      url: s.url,
      forever: true,
      pool: { maxSockets: 1024 }
    },
    (err, res, body) => {
      // explicitly shut down the agent
      if (typeof r.agent.destroy === 'function') {
        r.agent.destroy()
      } else {
        // node < 0.12
        Object.keys(r.agent.sockets).forEach(name => {
          r.agent.sockets[name].forEach(socket => {
            socket.end()
          })
        })
      }

      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'asdf')

      const agent = res.request.agent
      t.equal(agent.maxSockets, 1024)
      t.end()
    }
  )
})

tape('forever, should use same agent in sequential requests', t => {
  const r = request.defaults({
    forever: true
  })
  const req1 = r(s.url)
  const req2 = r(s.url + '/somepath')
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

tape(
  'forever, should use same agent in sequential requests(with pool.maxSockets)',
  t => {
    const r = request.defaults({
      forever: true,
      pool: { maxSockets: 1024 }
    })
    const req1 = r(s.url)
    const req2 = r(s.url + '/somepath')
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
  }
)

tape('forever, should use same agent in request() and request.verb', t => {
  const r = request.defaults({
    forever: true,
    pool: { maxSockets: 1024 }
  })
  const req1 = r(s.url)
  const req2 = r.get(s.url)
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

tape('should use different agent if pool option specified', t => {
  const r = request.defaults({
    forever: true,
    pool: { maxSockets: 1024 }
  })
  const req1 = r(s.url)
  const req2 = r.get({
    url: s.url,
    pool: { maxSockets: 20 }
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

tape('cleanup', t => {
  s.close(() => {
    t.end()
  })
})
