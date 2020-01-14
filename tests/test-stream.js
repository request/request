const fs = require('fs')
const path = require('path')
const http = require('http')
const tape = require('tape')
const request = require('../')
let server

tape('before', t => {
  server = http.createServer()
  server.on('request', (req, res) => {
    req.pipe(res)
  })
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('request body stream', t => {
  const fpath = path.join(__dirname, 'unicycle.jpg')
  const input = fs.createReadStream(fpath, { highWaterMark: 1000 })
  request(
    {
      uri: server.url,
      method: 'POST',
      body: input,
      encoding: null
    },
    (err, res, body) => {
      t.error(err)
      t.equal(body.length, fs.statSync(fpath).size)
      t.end()
    }
  )
})

tape('after', t => {
  server.close(t.end)
})
