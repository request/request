'use strict'
var spawn = require('child_process').spawn
var https = require('https')
var fs = require('fs')
var path = require('path')

var port = 6767

// Karma ignores kerberos, to do so it requires the 
// module to be installed. Since it's an optional dependency
// it might not always be available. If it's the case, we
// create a dummy index.js that gets cleaned up before closing
// the server
var kerbPath = path.join(__dirname, '../../', 'node_modules/kerberos')
var kerbIndex = kerbPath + '/index.js'
var kerbExists = false

if (!(kerbExists = fs.existsSync(kerbIndex))) {
  var content = 'var Kerberos = function() {}\nexports.Kerberos = Kerberos'
  fs.mkdirSync(kerbPath)
  fs.writeFileSync(kerbIndex, content)
}

var server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, '/ssl/server.key')),
  cert: fs.readFileSync(path.join(__dirname, '/ssl/server.crt')),
  ca: fs.readFileSync(path.join(__dirname, '/ssl/ca.crt')),
  requestCert: true,
  rejectUnauthorized: false
}, function (req, res) {
  // Set CORS header, since that is something we are testing.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.writeHead(200)
  res.end('Can you hear the sound of an enormous door slamming in the depths of hell?\n')
})
server.listen(port, function() {
  console.log('Started https server for karma tests on port ' + port)
  // Spawn process for karma.
  var c = spawn('karma', [
    'start',
    path.join(__dirname, '/karma.conf.js')
  ])
  c.stdout.pipe(process.stdout)
  c.stderr.pipe(process.stderr)
  c.on('exit', function(c) {
    try {
      if (!kerbExists) {
        fs.unlinkSync(kerbIndex)
        fs.rmdirSync(kerbPath)
      }
    } catch (e) {
      throw new Error('Error while cleaning up the dummy kerberos module: ' + e.message)
    }
    // Exit process with karma exit code.
    if (c !== 0) {
      throw new Error('Karma exited with status code ' + c)
    }
    server.close()
  })
})
