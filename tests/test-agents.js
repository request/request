'use strict'

var request = require('../index')
var http = require('http')
var https = require('https')
var tape = require('tape')

tape('http', function (t) {
  var r = request({
    uri: 'http://httpbin.org/get',
    agents: {
      http: new http.Agent({option1: true})
    }
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(r.agent instanceof http.Agent, 'is http.Agent')
    t.equal(r.agent.options.option1, true)
    t.end()
  })
})

tape('http.agentClass + http.agentOptions', function (t) {
  var r = request({
    uri: 'http://httpbin.org/get',
    agents: {
      http: {
        agentClass: http.Agent,
        agentOptions: {option2: true}
      }
    }
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(r.agent instanceof http.Agent, 'is http.Agent')
    t.equal(r.agent.options.option2, true)
    t.equal(Object.keys(r.agent.sockets).length, 1, '1 socket name')
    t.end()
  })
})

tape('https', function (t) {
  var r = request({
    uri: 'https://httpbin.org/get',
    agents: {
      https: new https.Agent({option3: true})
    }
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(r.agent instanceof https.Agent, 'is https.Agent')
    t.equal(r.agent.protocol, 'https:', 'is https.Agent for sure')
    t.equal(r.agent.options.option3, true)
    t.equal(Object.keys(r.agent.sockets).length, 1, '1 socket name')
    t.end()
  })
})

tape('https.agentClass + https.agentOptions', function (t) {
  var r = request({
    uri: 'https://httpbin.org/get',
    agents: {
      https: {
        agentClass: https.Agent,
        agentOptions: {option4: true}
      }
    }
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(r.agent instanceof https.Agent, 'is https.Agent')
    t.equal(r.agent.protocol, 'https:', 'is https.Agent for sure')
    t.equal(r.agent.options.option4, true)
    t.equal(Object.keys(r.agent.sockets).length, 1, '1 socket name')
    t.end()
  })
})

tape('http & https', function (t) {
  var r = request({
    uri: 'http://postman-echo.com/redirect-to?url=https://httpbin.org/get',
    agents: {
      http: new http.Agent({option5: true}),
      https: new https.Agent({option6: true})
    }
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(r.agent instanceof https.Agent, 'is https.Agent')
    t.equal(r.agent.protocol, 'https:', 'is https.Agent for sure')
    t.equal(r.agent.options.option6, true)
    t.equal(Object.keys(r.agent.sockets).length, 1, '1 socket name')
    t.end()
  })
})

tape('https & http', function (t) {
  var r = request({
    uri: 'https://httpbin.org/redirect-to?url=http://postman-echo.com/get',
    agents: {
      http: new http.Agent({option7: true}),
      https: new https.Agent({option8: true})
    }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(r.agent instanceof http.Agent, 'is http.Agent')
    t.equal(r.agent.options.option7, true)
    t.end()
  })
})
