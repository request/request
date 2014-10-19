'use strict'

var http = require('http')
  , path = require('path')
  , request = require('../index')
  , fs = require('fs')
  , tape = require('tape')

tape('multipart related', function(t) {

  var remoteFile = 'http://nodejs.org/images/logo.png'
    , localFile = path.join(__dirname, 'unicycle.jpg')
    , multipartData = []

  var server = http.createServer(function(req, res) {
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
      // check for http://nodejs.org/images/logo.png traces
      t.ok( data.indexOf('ImageReady') !== -1 )

      res.writeHead(200)
      res.end('done')
      t.end()
    })
  })

  server.listen(8080, function() {

    // @NOTE: multipartData properties must be set here so that my_file read stream does not leak in node v0.8
    multipartData = [
      {name: 'my_field', body: 'my_value'},
      {name: 'my_buffer', body: new Buffer([1, 2, 3])},
      {name: 'my_file', body: fs.createReadStream(localFile)},
      {name: 'remote_file', body: request(remoteFile)}
    ]

    request.post({
      url: 'http://localhost:8080/upload',
      multipart: multipartData
    }, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close()
    })

  })
})
