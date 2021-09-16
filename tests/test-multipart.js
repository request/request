'use strict'

var http = require('http')
var path = require('path')
var request = require('../index')
var fs = require('graceful-fs')
var tape = require('tape')

function runTest (t, a) {
  var remoteFile = path.join(__dirname, 'googledoodle.jpg')
  var localFile = path.join(__dirname, 'unicycle.jpg')
  var multipartData = []

  var server = http.createServer(function (req, res) {
    if (req.url === '/file') {
      res.writeHead(200, {'content-type': 'image/jpg'})
      res.end(fs.readFileSync(remoteFile), 'binary')
      return
    }

    if (a.header) {
      if (a.header.indexOf('mixed') !== -1) {
        t.ok(req.headers['content-type'].match(/^multipart\/mixed; boundary=[^\s;]+$/))
      } else {
        t.ok(req.headers['content-type']
          .match(/^multipart\/related; boundary=XXX; type=text\/xml; start="<root>"$/))
      }
    } else {
      t.ok(req.headers['content-type'].match(/^multipart\/related; boundary=[^\s;]+$/))
    }

    // temp workaround
    var data = ''
    req.setEncoding('utf8')

    req.on('data', function (d) {
      data += d
    })

    req.on('end', function () {
      // check for the fields traces

      // my_field
      t.ok(data.indexOf('name: my_field') !== -1)
      t.ok(data.indexOf(multipartData[0].body) !== -1)

      // my_number
      t.ok(data.indexOf('name: my_number') !== -1)
      t.ok(data.indexOf(multipartData[1].body) !== -1)

      // my_buffer
      t.ok(data.indexOf('name: my_buffer') !== -1)
      t.ok(data.indexOf(multipartData[2].body) !== -1)

      // my_file
      t.ok(data.indexOf('name: my_file') !== -1)
      // check for unicycle.jpg traces
      t.ok(data.indexOf('2005:06:21 01:44:12') !== -1)

      // remote_file
      t.ok(data.indexOf('name: remote_file') !== -1)
      // check for http://localhost:nnnn/file traces
      t.ok(data.indexOf('Photoshop ICC') !== -1)

      if (a.header && a.header.indexOf('boundary=XXX') !== -1) {
        t.ok(data.indexOf('--XXX') !== -1)
      }

      res.writeHead(200)
      res.end(a.json ? JSON.stringify({status: 'done'}) : 'done')
    })
  })

  server.listen(0, function () {
    var url = 'http://localhost:' + this.address().port
    // @NOTE: multipartData properties must be set here so that my_file read stream does not leak in node v0.8
    multipartData = [
      {name: 'my_field', body: 'my_value'},
      {name: 'my_number', body: 1000},
      {name: 'my_buffer', body: Buffer.from([1, 2, 3])},
      {name: 'my_file', body: fs.createReadStream(localFile)},
      {name: 'remote_file', body: request(url + '/file')}
    ]

    var reqOptions = {
      url: url + '/upload',
      multipart: multipartData
    }
    if (a.header) {
      reqOptions.headers = {
        'content-type': a.header
      }
    }
    if (a.json) {
      reqOptions.json = true
    }
    request[a.method](reqOptions, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(body, a.json ? {status: 'done'} : 'done')
      server.close(function () {
        t.end()
      })
    })
  })
}

var testHeaders = [
  null,
  'multipart/mixed',
  'multipart/related; boundary=XXX; type=text/xml; start="<root>"'
]

var methods = ['post', 'get']
methods.forEach(function (method) {
  testHeaders.forEach(function (header) {
    [true, false].forEach(function (json) {
      var name = [
        'multipart-related', method.toUpperCase(),
        (header || 'default'),
        (json ? '+' : '-') + 'json'
      ].join(' ')

      tape(name, function (t) {
        runTest(t, {method: method, header: header, json: json})
      })
    })
  })
})
