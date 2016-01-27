'use strict'

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
  var options = {
    url: s.url + path,
    aws: {
      key: 'my_key',
      secret: 'my_secret'
    },
    json: true
  }
  request(options, function(err, res, body) {    
    t.ok(body.authorization)
    t.notOk(body['x-amz-date'])
    t.end()
  })
})

tape('aws-sign4 options', function(t) {
  var options = {
    url: s.url + path,
    aws: {
      key: 'my_key',
      secret: 'my_secret',
      sign_version: 4
    },
    json: true
  }
  request(options, function(err, res, body) {    
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
