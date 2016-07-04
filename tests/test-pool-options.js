'use strict'

var request = require('../index')
  , server  = require('./server')
  , tape = require('tape')

var s = server.createSSLServer(function (req, res) {
  res.statusCode = 200
  res.end('asdf')
})

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

function abortRequest(request) {
  request.abort()
  if (typeof request.agent.destroy === 'function') {
    request.agent.destroy()
  }
}

function abortRequests(requests) {
  for (var i=0; i < requests.length; i++) {
    abortRequest(requests[i])
  }
}

tape('should use different agent if agentOptions.servername option is different', function(t) {
  var req1 = request({
    url: s.url,
    agentOptions: {servername: 'foo.bar.com'}
  })
  var req2 = request.get({
    url: s.url,
    agentOptions: {servername: 'foo2.bar.com'}
  })
  abortRequests([req1, req2])
  t.notEqual(req1.agent, req2.agent)
  t.end()
})

tape('should use different agent if servername option is different', function(t) {
  var req1 = request({
    url: s.url,
    servername: 'foo.bar.com'
  })
  var req2 = request.get({
    url: s.url,
    servername: 'foo2.bar.com'
  })
  abortRequests([req1, req2])
  t.notEqual(req1.agent, req2.agent)
  t.end()
})

tape('should not use different agent if agentOptions.servername option is equal', function(t) {
  var req1 = request({
    url: s.url,
    agentOptions: {servername: 'foo.bar.com'}
  })
  var req2 = request.get({
    url: s.url,
    agentOptions: {servername: 'foo.bar.com'}
  })
  abortRequests([req1, req2])
  t.equal(req1.agent, req2.agent)
  t.end()
})

tape('should not use different agent if servername option is equal', function(t) {
  var req1 = request({
    url: s.url,
    servername: 'foo.bar.com',
    ca: 'ca'
  })
  var req2 = request.get({
    url: s.url,
    servername: 'foo.bar.com',
    ca: 'ca'
  })
  abortRequests([req1, req2])
  t.equal(req1.agent, req2.agent)
  t.end()
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
