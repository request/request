'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')

let plainServer = server.createServer()
let redirectMockTime = 10

tape('setup', function (t) {
  plainServer.listen(0, function () {
    plainServer.on('/', function (req, res) {
      res.writeHead(200)
      res.end('plain')
    })
    plainServer.on('/redir', function (req, res) {
      // fake redirect delay to ensure strong signal for rollup check
      setTimeout(function () {
        res.writeHead(301, { 'location': 'http://localhost:' + plainServer.port + '/' })
        res.end()
      }, redirectMockTime)
    })

    t.end()
  })
})

tape('non-redirected request is timed', function (t) {
  var options = {time: true}
  var r = request('http://localhost:' + plainServer.port + '/', options, function (err, res, body) {
    t.equal(err, null)
    t.equal(typeof res.elapsedTime, 'number')
    t.equal(typeof res.responseStartTime, 'number')
    t.equal(typeof res.timings, 'object')
    t.equal((res.elapsedTime > 0), true)
    t.equal((res.responseStartTime > r.startTime), true)
    t.equal((res.timings.start > 0), true)
    t.equal((res.timings.socket >= res.timings.start), true)
    t.equal((res.timings.connect >= res.timings.socket), true)
    t.equal((res.timings.response >= res.timings.connect), true)
    t.equal((res.timings.end >= res.timings.response), true)
    t.equal((res.timings.dns >= 0), true)
    t.equal((res.timings.tcp >= 0), true)
    t.equal((res.timings.firstByte > 0), true)
    t.equal((res.timings.download > 0), true)
    t.equal((res.timings.total > 0), true)

    // validate there are no unexpected properties
    var propNames = []
    for (var propName in res.timings) {
      if (res.timings.hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, ['start', 'socket', 'connect', 'response', 'end', 'dns',
      'tcp', 'firstByte', 'download', 'total'])

    t.end()
  })
})

tape('redirected request is timed with rollup', function (t) {
  var options = {time: true}
  var r = request('http://localhost:' + plainServer.port + '/redir', options, function (err, res, body) {
    t.equal(err, null)
    t.equal(typeof res.elapsedTime, 'number')
    t.equal(typeof res.responseStartTime, 'number')
    t.equal((res.elapsedTime > 0), true)
    t.equal((res.responseStartTime > 0), true)
    t.equal((res.elapsedTime > redirectMockTime), true)
    t.equal((res.responseStartTime > r.startTime), true)
    t.end()
  })
})

tape('cleanup', function (t) {
  plainServer.close(function () {
    t.end()
  })
})
