'use strict'

var server = require('./server')
  , request = require('../index')
  , tape = require('tape')

var plain_server = server.createServer()
  , redirect_mock_time = 10

tape('setup', function(t) {
  plain_server.listen(0, function() {
    plain_server.on('/', function (req, res) {
      res.writeHead(200)
      res.end('plain')
    })
    plain_server.on('/redir', function (req, res) {
      // fake redirect delay to ensure strong signal for rollup check
      setTimeout(function() {
        res.writeHead(301, { 'location': 'http://localhost:' + plain_server.port + '/' })
        res.end()
      }, redirect_mock_time)
    })

    t.end()
  })
})

tape('non-redirected request is timed', function(t) {
  var options = {time: true}
  var start = new Date().getTime()
  var r = request('http://localhost:' + plain_server.port + '/', options, function(err, res, body) {
    var end = new Date().getTime()
    t.equal(err, null)
    t.equal(typeof res.elapsedTime, 'number')
    t.equal(typeof res.responseStartTime, 'number')
    t.equal(typeof res.timingStart, 'number')
    t.equal((res.timingStart >= start), true)
    t.equal(typeof res.timings, 'object')
    t.equal((res.elapsedTime > 0), true)
    t.equal((res.elapsedTime <= (end - start)), true)
    t.equal((res.responseStartTime > r.startTime), true)
    t.equal((res.timings.socket >= 0), true)
    t.equal((res.timings.lookup >= res.timings.socket), true)
    t.equal((res.timings.connect >= res.timings.lookup), true)
    t.equal((res.timings.response >= res.timings.connect), true)
    t.equal((res.timings.end >= res.timings.response), true)
    t.equal(typeof res.timingPhases, 'object')
    t.equal((res.timingPhases.wait >= 0), true)
    t.equal((res.timingPhases.dns >= 0), true)
    t.equal((res.timingPhases.tcp >= 0), true)
    t.equal((res.timingPhases.firstByte > 0), true)
    t.equal((res.timingPhases.download > 0), true)
    t.equal((res.timingPhases.total > 0), true)
    t.equal((res.timingPhases.total <= (end - start)), true)

    // validate there are no unexpected properties
    var propNames = []
    for (var propName in res.timings) {
      if (res.timings.hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, ['socket', 'lookup', 'connect', 'response', 'end'])

    propNames = []
    for (var propName in res.timingPhases) {
      if (res.timingPhases.hasOwnProperty(propName)) {
        propNames.push(propName)
      }
    }
    t.deepEqual(propNames, ['wait', 'dns', 'tcp', 'firstByte', 'download', 'total'])

    t.end()
  })
})

tape('redirected request is timed with rollup', function(t) {
  var options = {time: true}
  var r = request('http://localhost:' + plain_server.port + '/redir', options, function(err, res, body) {
    t.equal(err, null)
    t.equal(typeof res.elapsedTime, 'number')
    t.equal(typeof res.responseStartTime, 'number')
    t.equal((res.elapsedTime > 0), true)
    t.equal((res.responseStartTime > 0), true)
    t.equal((res.elapsedTime > redirect_mock_time), true)
    t.equal((res.responseStartTime > r.startTime), true)
    t.end()
  })
})

tape('cleanup', function(t) {
  plain_server.close(function() {
    t.end()
  })
})
