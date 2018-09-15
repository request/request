'use strict'

var fs = require('fs')
var https = require('https')
var options = { key: fs.readFileSync('./localhost.key'),
  cert: fs.readFileSync('./localhost.crt') }

var server = https.createServer(options, function (req, res) {
  res.writeHead(200)
  res.end()
  server.close()
})
server.listen(0, function () {
  var ca = fs.readFileSync('./ca.crt')
  var agent = new https.Agent({
    host: 'localhost',
    port: this.address().port,
    ca: ca
  })

  https.request({ host: 'localhost',
    method: 'HEAD',
    port: this.address().port,
    agent: agent,
    ca: [ ca ],
    path: '/' }, function (res) {
    if (res.socket.authorized) {
      console.log('node test: OK')
    } else {
      throw new Error(res.socket.authorizationError)
    }
  }).end()
})
