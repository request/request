'use strict'

var http = require('http')
  , path = require('path')
  , request = require('../index')
  , fs = require('fs')
  , tape = require('tape')

function runTest(t, a) {
  var remoteFile = path.join(__dirname, 'googledoodle.jpg')
    , localFile = path.join(__dirname, 'unicycle.jpg')
    , multipartData = []
    , chunked = a.stream || a.chunked || a.encoding

  var server = http.createServer(function(req, res) {
    if (req.url === '/file') {
      res.writeHead(200, {'content-type': 'image/jpg'})
      res.end(fs.readFileSync(remoteFile), 'binary')
      return
    }

    if (a.mixed) {
      t.ok(req.headers['content-type'].match(/multipart\/mixed/))
    } else {
      t.ok(req.headers['content-type'].match(/multipart\/related/))
    }

    if (chunked) {
      t.ok(req.headers['transfer-encoding'] === 'chunked')
      t.notOk(req.headers['content-length'])
    } else {
      t.ok(req.headers['content-length'])
      t.notOk(req.headers['transfer-encoding'])
    }

    // temp workaround
    var data = ''
    req.setEncoding('utf8')

    req.on('data', function(d) {
      data += d
    })

    req.on('end', function() {
      // check for the fields' traces

      // 1st field : my_field
      t.ok( data.indexOf('name: my_field') !== -1 )
      t.ok( data.indexOf(multipartData[0].body) !== -1 )

      // 2nd field : my_buffer
      t.ok( data.indexOf('name: my_buffer') !== -1 )
      t.ok( data.indexOf(multipartData[1].body) !== -1 )

      if (chunked) {
        // 3rd field : my_file
        t.ok( data.indexOf('name: my_file') !== -1 )
        // check for unicycle.jpg traces
        t.ok( data.indexOf('2005:06:21 01:44:12') !== -1 )

        // 4th field : remote_file
        t.ok( data.indexOf('name: remote_file') !== -1 )
        // check for http://localhost:8080/file traces
        t.ok( data.indexOf('Photoshop ICC') !== -1 )
      }

      res.writeHead(200)
      res.end(a.json ? JSON.stringify({status: 'done'}) : 'done')
    })
  })

  server.listen(8080, function() {

    // @NOTE: multipartData properties must be set here so that my_file read stream does not leak in node v0.8
    multipartData = chunked
      ? [
        {name: 'my_field', body: 'my_value'},
        {name: 'my_buffer', body: new Buffer([1, 2, 3])},
        {name: 'my_file', body: fs.createReadStream(localFile)},
        {name: 'remote_file', body: request('http://localhost:8080/file')}
      ]
      : [
        {name: 'my_field', body: 'my_value'},
        {name: 'my_buffer', body: new Buffer([1, 2, 3])}
      ]

    var reqOptions = {
      url: 'http://localhost:8080/upload',
      headers: (function () {
        var headers = {}
        if (a.mixed) {
          headers['content-type'] = 'multipart/mixed'
        }
        if (a.encoding) {
          headers['transfer-encoding'] = 'chunked'
        }
        return headers
      }()),
      multipart: a.array
        ? multipartData
        : {chunked: a.chunked, data: multipartData}
    }
    if (a.json) {
      reqOptions.json = true
    }
    request[a.method](reqOptions, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(body, a.json ? {status: 'done'} : 'done')
      server.close()
      t.end()
    })

  })
}

// array - multipart option is array
// object - multipart option is object
// encoding -  headers option have transfer-encoding set to chunked
// mixed - headers option have content-type set to something different than multipart/related
// json - json option
// stream - body contains streams or not
// chunked - chunked is set when multipart is object

// var methods = ['post', 'get']
var cases = [
  // based on body type
  {name: '+array -stream',   args: {array: true, encoding: false, stream: false}},
  {name: '+array +stream',   args: {array: true, encoding: false, stream: true}},
  // encoding overrides stream
  {name: '+array +encoding',   args: {array: true, encoding: true, stream: false}},

  // based on body type
  {name: '+object -stream',   args: {object: true, encoding: false, stream: false}},
  {name: '+object +stream',   args: {object: true, encoding: false, stream: true}},
  // encoding overrides stream
  {name: '+object +encoding',   args: {object: true, encoding: true, stream: false}},

  // based on body type
  {name: '+object -chunked -stream',   args: {object: true, encoding: false, chunked: false, stream: false}},
  {name: '+object -chunked +stream',   args: {object: true, encoding: false, chunked: false, stream: true}},
  // chunked overrides stream
  {name: '+object +chunked -stream',   args: {object: true, encoding: false, chunked: true, stream: false}},
  // chunked overrides encoding
  {name: '+object +encoding -chunked',   args: {object: true, encoding: true, chunked: false, stream: false}},
  // stream overrides chunked
  {name: '+object +encoding -chunked +stream',   args: {object: true, encoding: true, chunked: false, stream: true}}
]

var suite = ['post', 'get'].forEach(function(method) {
  [true, false].forEach(function(json) {
    [true, false].forEach(function(mixed) {
      cases.forEach(function (test) {
        var name = [
          'multipart related', method,
          (json ? '+' : '-') + 'json',
          (mixed ? '+' : '-') + 'mixed',
          test.name
        ].join(' ')

        tape(name, function(t) {
          test.args.method = method
          test.args.json = json
          test.args.mixed = mixed
          runTest(t, test.args)
        })
      })
    })
  })
})
