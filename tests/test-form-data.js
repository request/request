'use strict'

var http = require('http')
  , path = require('path')
  , mime = require('mime-types')
  , request = require('../index')
  , fs = require('fs')
  , tape = require('tape')

tape('multipart formData', function(t) {
  t.plan(20)

  var remoteFile = 'http://nodejs.org/images/logo.png'
    , multipartFormData = {}

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
      t.ok( data.indexOf('form-data; name="my_field"') !== -1 )
      t.ok( data.indexOf(multipartFormData.my_field) !== -1 )

      // 2nd field : my_buffer
      t.ok( data.indexOf('form-data; name="my_buffer"') !== -1 )
      t.ok( data.indexOf(multipartFormData.my_buffer) !== -1 )

      // 3rd field : my_file
      t.ok( data.indexOf('form-data; name="my_file"') !== -1 )
      t.ok( data.indexOf('; filename="' + path.basename(multipartFormData.my_file.path) + '"') !== -1 )
      // check for unicycle.jpg traces
      t.ok( data.indexOf('2005:06:21 01:44:12') !== -1 )
      t.ok( data.indexOf('Content-Type: ' + mime.lookup(multipartFormData.my_file.path) ) !== -1 )

      // 4th field : remote_file
      t.ok( data.indexOf('form-data; name="remote_file"') !== -1 )
      t.ok( data.indexOf('; filename="' + path.basename(multipartFormData.remote_file.path) + '"') !== -1 )

      // 5th field : file with metadata
      t.ok( data.indexOf('form-data; name="secret_file"') !== -1 )
      t.ok( data.indexOf('Content-Disposition: form-data; name="secret_file"; filename="topsecret.jpg"') !== -1 )
      t.ok( data.indexOf('Content-Type: image/custom') !== -1 )

      // 6th field : batch of files
      t.ok( data.indexOf('form-data; name="batch"') !== -1 )
      t.ok( data.match(/form-data; name="batch"/g).length === 2 )

      // check for http://nodejs.org/images/logo.png traces
      t.ok( data.indexOf('ImageReady') !== -1 )
      t.ok( data.indexOf('Content-Type: ' + mime.lookup(remoteFile) ) !== -1 )

      res.writeHead(200)
      res.end('done')
    })
  })

  server.listen(8080, function() {

    // @NOTE: multipartFormData properties must be set here so that my_file read stream does not leak in node v0.8
    multipartFormData.my_field = 'my_value'
    multipartFormData.my_buffer = new Buffer([1, 2, 3])
    multipartFormData.my_file = fs.createReadStream(__dirname + '/unicycle.jpg')
    multipartFormData.remote_file = request(remoteFile)
    multipartFormData.secret_file = {
      value: fs.createReadStream(__dirname + '/unicycle.jpg'),
      options: {
        filename: 'topsecret.jpg',
        contentType: 'image/custom'
      }
    }
    multipartFormData.batch = [
      fs.createReadStream(__dirname + '/unicycle.jpg'),
      fs.createReadStream(__dirname + '/unicycle.jpg')
    ]

    request.post({
      url: 'http://localhost:8080/upload',
      formData: multipartFormData
    }, function (err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close()
    })

  })
})
