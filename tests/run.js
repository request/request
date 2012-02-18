var fs = require('fs')
  , spawn = require('child_process').spawn
  , tests = []
  , exitCode = 0
  ;
 
fs.readdirSync('tests').forEach(function (file) {
  if (! /test-/.test(file)) return

  tests.push('tests/' + file)
})

var next = function () {
  if (tests.length === 0) process.exit(exitCode);
  
  var file = tests.pop()
  console.log(file)
  var proc = spawn('node', [ file ])
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  proc.on('exit', function (code) {
  	exitCode += code || 0
  	next()
  })
}
next()