'use strict'

var path = require('path')
var request = require('..')
var tape = require('tape')
var fixture = require('./fixtures/har.json')
var server = require('./server')

var s = server.createEchoServer()

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

tape('application-form-encoded', function (t) {
  var options = {
    url: s.url,
    har: fixture['application-form-encoded']
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.body, 'foo=bar&hello=world')
    t.end()
  })
})

tape('application-json', function (t) {
  var options = {
    url: s.url,
    har: fixture['application-json']
  }

  request(options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body.body, fixture['application-json'].postData.text)
    t.end()
  })
})

tape('cookies', function (t) {
  var options = {
    url: s.url,
    har: fixture.cookies
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.headers.cookie, 'foo=bar; bar=baz')
    t.end()
  })
})

tape('custom-method', function (t) {
  var options = {
    url: s.url,
    har: fixture['custom-method']
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.method, fixture['custom-method'].method)
    t.end()
  })
})

tape('headers', function (t) {
  var options = {
    url: s.url,
    har: fixture.headers
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.headers['x-foo'], 'Bar')
    t.end()
  })
})

tape('multipart-data', function (t) {
  var options = {
    url: s.url,
    har: fixture['multipart-data']
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.ok(~json.headers['content-type'].indexOf('multipart/form-data'))
    t.ok(~json.body.indexOf('Content-Disposition: form-data; name="foo"; filename="hello.txt"\r\nContent-Type: text/plain\r\n\r\nHello World'))
    t.end()
  })
})

tape('multipart-file', function (t) {
  var options = {
    url: s.url,
    har: fixture['multipart-file']
  }
  var absolutePath = path.resolve(__dirname, options.har.postData.params[0].fileName)
  options.har.postData.params[0].fileName = absolutePath

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.ok(~json.headers['content-type'].indexOf('multipart/form-data'))
    t.ok(~json.body.indexOf('Content-Disposition: form-data; name="foo"; filename="unicycle.jpg"\r\nContent-Type: image/jpeg'))
    t.end()
  })
})

tape('multipart-form-data', function (t) {
  var options = {
    url: s.url,
    har: fixture['multipart-form-data']
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.ok(~json.headers['content-type'].indexOf('multipart/form-data'))
    t.ok(~json.body.indexOf('Content-Disposition: form-data; name="foo"'))
    t.end()
  })
})

tape('query', function (t) {
  var options = {
    url: s.url + '/?fff=sss',
    har: fixture.query
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.url, '/?fff=sss&foo%5B0%5D=bar&foo%5B1%5D=baz&baz=abc')
    t.end()
  })
})

tape('text/plain', function (t) {
  var options = {
    url: s.url,
    har: fixture['text-plain']
  }

  request(options, function (err, res, body) {
    var json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.headers['content-type'], 'text/plain')
    t.equal(json.body, 'Hello World')
    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
