'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')

const s = server.createServer()

tape('setup', (t) => {
  s.listen(0, () => {
    s.on('/', (req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.write('waited')
      res.end()
    })
    t.end()
  })
})

tape('should emit socket event', (t) => {
  t.plan(4)

  const req = request(s.url, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'waited')
  })

  req.on('socket', (socket) => {
    const requestSocket = req.req.socket
    t.equal(requestSocket, socket)
  })
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
