'use strict'

if (process.env.running_under_istanbul) {
  // test-agent.js modifies the process state
  // causing these tests to fail when running under single process via tape
  return
}

var request = require('../index') 
  , server  = require('./server')
  , tape    = require('tape')

var s = server.createServer()

var path = '/aws.json'

s.on(path, function(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(req.headers))
})

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

tape('default behaviour: aws-sign2 without sign_version key', function(t) {
  var aws2_options = { aws: {} }
  aws2_options.aws.key = 'my_key'
  aws2_options.aws.secret = 'my_secret'
  aws2_options.url = s.url + path
  aws2_options.json = true
  
  request(aws2_options, function(err, res, body) {    
    t.ok(body.authorization)
    t.notOk(body['x-amz-date'])
    t.end()
  })
})

tape('aws-sign2 with sign_version key', function(t) {
  var aws2_options = { aws: {} }
  aws2_options.aws.key = 'my_key'
  aws2_options.aws.secret = 'my_secret'
  aws2_options.aws.sign_version = 2
  aws2_options.url = s.url + path
  aws2_options.json = true
  
  request(aws2_options, function(err, res, body) {    
    t.ok(body.authorization)
    t.notOk(body['x-amz-date'])
    t.end()
  })
})

tape('aws-sign4 options', function(t) {
  var aws2_options = { aws: {} }
  aws2_options.aws.key = 'my_key'
  aws2_options.aws.secret = 'my_secret'
  aws2_options.aws.sign_version = 4
  aws2_options.url = s.url + path
  aws2_options.json = true
  
  request(aws2_options, function(err, res, body) {    
    t.ok(body.authorization)
    t.ok(body['x-amz-date'])
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
