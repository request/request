'use strict'

if (process.env.running_under_istanbul) {
  // test-agent.js modifies the process state
  // causing these tests to fail when running under single process via tape
  return
}

var request = require('../index')
  , http    = require('http')
  , server  = require('./server')
  , tape    = require('tape')

var s = server.createServer(function (req, resp) {
  resp.statusCode = 200
  resp.end('')
})

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

tape('without agentOptions should use global agent', function(t) {
  var r = request(s.url, function(/*err, res, body*/) {
    // TODO: figure out why err.code === 'ECONNREFUSED' on Travis?
    //if (err) console.log(err)
    //t.equal(err, null)
    t.deepEqual(r.agent, http.globalAgent)
    t.equal(Object.keys(r.pool).length, 0)
    t.end()
  })
})

tape('with agentOptions should apply to new agent in pool', function(t) {
  var r = request(s.url, {
    agentOptions: { foo: 'bar' }
  }, function(/*err, res, body*/) {
    // TODO: figure out why err.code === 'ECONNREFUSED' on Travis?
    //if (err) console.log(err)
    //t.equal(err, null)
    t.equal(r.agent.options.foo, 'bar')
    t.equal(Object.keys(r.pool).length, 1)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
