'use strict'
const spawn = require('child_process').spawn
const https = require('https')
const fs = require('fs')
const path = require('path')

const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, '/ssl/server.key')),
  cert: fs.readFileSync(path.join(__dirname, '/ssl/server.crt')),
  ca: fs.readFileSync(path.join(__dirname, '/ssl/ca.crt')),
  requestCert: true,
  rejectUnauthorized: false
}, (req, res) => {
  // Set CORS header, since that is something we are testing.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.writeHead(200)
  res.end('Can you hear the sound of an enormous door slamming in the depths of hell?\n')
})
server.listen(0, function () {
  const port = this.address().port
  console.log('Started https server for karma tests on port ' + port)
  // Spawn process for karma.
  const c = spawn('karma', [
    'start',
    path.join(__dirname, '/karma.conf.js'),
    'https://localhost:' + port
  ])
  c.stdout.pipe(process.stdout)
  c.stderr.pipe(process.stderr)
  c.on('exit', (c) => {
    // Exit process with karma exit code.
    if (c !== 0) {
      throw new Error('Karma exited with status code ' + c)
    }
    server.close()
  })
})
