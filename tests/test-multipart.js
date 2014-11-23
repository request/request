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
    , chunked = a.array || (a.chunked === undefined) || a.chunked

  var server = http.createServer(function(req, res) {
    if (req.url === '/file') {
      res.writeHead(200, {'content-type': 'image/jpg'})
      res.end(fs.readFileSync(remoteFile), 'binary')
      return
    }

    if (a.headers) {
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
      headers: (a.headers ? {'content-type': 'multipart/mixed'} : undefined),
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

var methods = ['post', 'get']
var cases = [
  {name: '-json +array',   args: {json: false, array: true}},
  {name: '-json -array',   args: {json: false, array: false}},
  {name: '-json +chunked', args: {json: false, array: false, chunked: true}},
  {name: '-json -chunked', args: {json: false, array: false, chunked: false}},

  {name: '-json +headers +array',   args: {json: false, headers: true, array: true}},
  {name: '-json +headers -array',   args: {json: false, headers: true, array: false}},
  {name: '-json +headers +chunked', args: {json: false, headers: true, array: false, chunked: true}},
  {name: '-json +headers -chunked', args: {json: false, headers: true, array: false, chunked: false}},

  {name: '+json +array',   args: {json: true, array: true}},
  {name: '+json -array',   args: {json: true, array: false}},
  {name: '+json +chunked', args: {json: true, array: false, chunked: true}},
  {name: '+json -chunked', args: {json: true, array: false, chunked: false}},

  {name: '+json +headers +array',   args: {json: true, headers: true, array: true}},
  {name: '+json +headers -array',   args: {json: true, headers: true, array: false}},
  {name: '+json +headers +chunked', args: {json: true, headers: true, array: false, chunked: true}},
  {name: '+json +headers -chunked', args: {json: true, headers: true, array: false, chunked: false}}
]

methods.forEach(function(method) {
  cases.forEach(function (test) {
    tape('multipart related ' + method + ' ' + test.name, function(t) {
      test.args.method = method
      runTest(t, test.args)
    })
  })
})
