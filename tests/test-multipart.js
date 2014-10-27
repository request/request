'use strict'

var http = require('http')
  , path = require('path')
  , request = require('../index')
  , fs = require('fs')
  , tape = require('tape')

function runTest(t, json) {
  var remoteFile = path.join(__dirname, 'googledoodle.jpg')
    , localFile = path.join(__dirname, 'unicycle.jpg')
    , multipartData = []

  var server = http.createServer(function(req, res) {
    if (req.url === '/file') {
      res.writeHead(200, {'content-type': 'image/jpg'})
      res.end(fs.readFileSync(remoteFile), 'binary')
      return
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

      // 3rd field : my_file
      t.ok( data.indexOf('name: my_file') !== -1 )
      // check for unicycle.jpg traces
      t.ok( data.indexOf('2005:06:21 01:44:12') !== -1 )

      // 4th field : remote_file
      t.ok( data.indexOf('name: remote_file') !== -1 )
      // check for http://localhost:8080/file traces
      t.ok( data.indexOf('Photoshop ICC') !== -1 )

      res.writeHead(200)
      res.end(json ? JSON.stringify({status: 'done'}) : 'done')
    })
  })

  server.listen(8080, function() {

    // @NOTE: multipartData properties must be set here so that my_file read stream does not leak in node v0.8
    multipartData = [
      {name: 'my_field', body: 'my_value'},
      {name: 'my_buffer', body: new Buffer([1, 2, 3])},
      {name: 'my_file', body: fs.createReadStream(localFile)},
      {name: 'remote_file', body: request('http://localhost:8080/file')}
    ]

    var reqOptions = {
      url: 'http://localhost:8080/upload',
      multipart: multipartData
    }
    if (json) {
      reqOptions.json = true
    }
    request.post(reqOptions, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(body, json ? {status: 'done'} : 'done')
      server.close()
      t.end()
    })

  })
}

tape('multipart related', function(t) {
  runTest(t, false)
})

tape('multipart related + JSON', function(t) {
  runTest(t, true)
})
