var request = require('../index')
  , http    = require('http')
  , server  = require('./server')
  , tape    = require('tape')

var s
  , port = 8111

tape('setup', function(t) {
  s = server.createServer(function (req, resp) {
    resp.statusCode = 200
    resp.end('')
  }).listen(port, function() {
    t.end()
  })
})

tape('without agentOptions should use global agent', function(t) {
  t.plan(3)
  var r = request(s.url, function(err, res, body) {
    t.equal(err, null)
    t.deepEqual(r.agent, http.globalAgent)
    t.equal(Object.keys(r.pool).length, 0)
  })
})

tape('with agentOptions should apply to new agent in pool', function(t) {
  t.plan(3)
  var r = request(s.url, {
    agentOptions: { foo: 'bar' }
  }, function(err, res, body) {
    t.equal(err, null)
    t.equal(r.agent.options.foo, 'bar')
    t.equal(Object.keys(r.pool).length, 1)
  })
})

tape('cleanup', function(t) {
  s.close()
  t.end()
})
