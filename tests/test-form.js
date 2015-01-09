'use strict'

var http = require('http')
  , path = require('path')
  , mime = require('mime-types')
  , request = require('../index')
  , fs = require('fs')
  , tape = require('tape')

tape('multipart form append', function(t) {

  var remoteFile = path.join(__dirname, 'googledoodle.jpg')
    , localFile = path.join(__dirname, 'unicycle.jpg')
    , totalLength = null
    , FIELDS = []

  var server = http.createServer(function(req, res) {
    if (req.url === '/file') {
      res.writeHead(200, {'content-type': 'image/jpg', 'content-length':7187})
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
      var field
      // check for the fields' traces

      // 1st field : my_field
      field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf(field.value) !== -1 )

      // 2nd field : my_buffer
      field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf(field.value) !== -1 )

      // 3rd field : my_file
      field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf('; filename="' + path.basename(field.value.path) + '"') !== -1 )
      // check for unicycle.jpg traces
      t.ok( data.indexOf('2005:06:21 01:44:12') !== -1 )
      t.ok( data.indexOf('Content-Type: ' + mime.lookup(field.value.path) ) !== -1 )

      // 4th field : remote_file
      field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf('; filename="' + path.basename(field.value.path) + '"') !== -1 )
      // check for http://localhost:6767/file traces
      t.ok( data.indexOf('Photoshop ICC') !== -1 )
      t.ok( data.indexOf('Content-Type: ' + mime.lookup(remoteFile) ) !== -1 )

      t.ok( +req.headers['content-length'] === totalLength )

      res.writeHead(200)
      res.end('done')

      t.equal(FIELDS.length, 0)
    })
  })

  server.listen(6767, function() {

    FIELDS = [
      { name: 'my_field', value: 'my_value' },
      { name: 'my_buffer', value: new Buffer([1, 2, 3]) },
      { name: 'my_file', value: fs.createReadStream(localFile) },
      { name: 'remote_file', value: request('http://localhost:6767/file') }
    ]

    var req = request.post('http://localhost:6767/upload', function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close(function() {
        t.end()
      })
    })
    var form = req.form()

    FIELDS.forEach(function(field) {
      form.append(field.name, field.value)
    })

    form.getLength(function(err, length) {
      t.equal(err, null)
      totalLength = length
    })
  })
})
