'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')
let server

tape('setup', (t) => {
  server = http.createServer()
  server.on('request', (req, res) => {
    res.writeHead(202)
    req.pipe(res)
  })
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('callback option', (t) => {
  request({
    url: server.url,
    callback: (err, res, body) => {
      t.error(err)
      t.equal(res.statusCode, 202)
      t.end()
    }
  })
})

tape('cleanup', (t) => {
  server.close(t.end)
})
