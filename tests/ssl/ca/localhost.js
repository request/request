'use strict'

var fs = require('fs')
var https = require('https')
var options = { key: fs.readFileSync('./localhost.key')
              , cert: fs.readFileSync('./localhost.crt') }

var server = https.createServer(options, function (req, res) {
  res.writeHead(200)
  res.end()
  server.close()
})
server.listen(1337)

var ca = fs.readFileSync('./ca.crt')
var agent = new https.Agent({ host: 'localhost', port: 1337, ca: ca })

https.request({ host: 'localhost'
              , method: 'HEAD'
              , port: 1337
              , agent: agent
              , ca: [ ca ]
              , path: '/' }, function (res) {
  if (res.client.authorized) {
    console.log('node test: OK')
  } else {
    throw new Error(res.client.authorizationError)
  }
}).end()
