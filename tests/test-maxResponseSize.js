var request = require('../index')
var http = require('http')
var zlib = require('zlib')
var tape = require('tape')
var url = require('url')

var CHAR = 'X'

// request path to this server should be of the form '/<bytes>?gzip=[true/false]'
// response from the server will have size of <bytes> from request path
var server = http.createServer(function (req, res) {
  var parsedUrl = url.parse(req.url, {parseQueryString: true})
  var bytes = parseInt(parsedUrl.pathname.substring(1)) || 0
  var gzip = parsedUrl.query.gzip
  var data = Buffer.from(CHAR.repeat(bytes))

  res.setHeader('Content-Type', 'text/plain')

  if (gzip === 'true') {
    zlib.gzip(data, function (err, compressedData) {
      if (err) {
        res.writeHead(500)
        res.end()
        return
      }

      res.setHeader('Content-Encoding', 'gzip')
      res.setHeader('Content-Length', compressedData.length)
      res.writeHead(200)
      res.write(compressedData)
      res.end()
    })
  } else {
    res.setHeader('Content-Length', data.length)
    res.writeHead(200)
    res.write(data)
    res.end()
  }
})

tape('setup', function (t) {
  server.listen(0, function () {
    server.port = this.address().port
    server.url = 'http://localhost:' + server.port
    t.end()
  })
})

tape('response < maxResponseSize', function (t) {
  var options = {
    method: 'GET',
    uri: server.url + '/50',
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
    uri: server.url + '/100',
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
    uri: server.url + '/200',
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
    uri: server.url + '/500?gzip=true', // for 500 bytes gzip response, content-length will be around 30
    maxResponseSize: 490,
    gzip: true
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
    uri: server.url + '/100?gzip=true',
    maxResponseSize: 200,
    gzip: true
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.ok(body, 'Should receive body')
    t.ok(body.length < options.maxResponseSize)
    t.end()
  })
})

tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})
