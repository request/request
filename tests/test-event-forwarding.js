'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')

const s = server.createServer()

tape('setup', function (t) {
  s.listen(0, function () {
    s.on('/', function (req, res) {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.write('waited')
      res.end()
    })
    t.end()
  })
})

tape('should emit socket event', function (t) {
  t.plan(4)

  const req = request(s.url, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'waited')
  })

  req.on('socket', function (socket) {
    const requestSocket = req.req.socket
    t.equal(requestSocket, socket)
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
