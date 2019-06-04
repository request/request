var request = require('../index')
var tape = require('tape')

var echoDomain = 'https://postman-echo.com'

tape('response < maxResponseSize', function (t) {
  var options = {
    method: 'GET',
    uri: echoDomain + '/bytes/50',
    maxResponseSize: 100
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(body, 'Should receive body')
    t.ok(body.length < options.maxResponseSize)
    t.end()
  })
})

tape('response = maxResponseSize', function (t) {
  var options = {
    method: 'GET',
    uri: echoDomain + '/bytes/100',
    maxResponseSize: 100
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(body, 'Should receive body')
    t.ok(body.length === options.maxResponseSize)
    t.end()
  })
})

tape('response > maxResponseSize', function (t) {
  var options = {
    method: 'GET',
    uri: echoDomain + '/bytes/200',
    maxResponseSize: 100
  }

  request(options, function (err, res, body) {
    t.notEqual(err, null)
    t.equal(typeof err, 'object')
    t.equal(err.name, 'Error')
    t.equal(err.message, 'Maximum response size reached')
    t.end()
  })
})

tape('extracted gzip response > maxResponseSize but content-length < maxResponseSize', function (t) {
  var options = {
    method: 'GET',
    uri: echoDomain + '/bytes/500', // for random 500 bytes gzip response, content-length will be around 350
    maxResponseSize: 490,
    gzip: true,
    headers: {
      'Accept-Encoding': 'gzip'
    }
  }

  request(options, function (err, res, body) {
    t.notEqual(err, null)
    t.equal(typeof err, 'object')
    t.equal(err.name, 'Error')
    t.equal(err.message, 'Maximum response size reached')
    t.end()
  })
})

tape('extracted gzip response < maxResponseSize', function (t) {
  var options = {
    method: 'GET',
    uri: echoDomain + '/bytes/100',
    maxResponseSize: 200,
    gzip: true,
    headers: {
      'Accept-Encoding': 'gzip'
    }
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(body, 'Should receive body')
    t.ok(body.length < options.maxResponseSize)
    t.end()
  })
})
