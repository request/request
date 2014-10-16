'use strict'

var http = require('http')
  , path = require('path')
  , mime = require('mime-types')
  , request = require('../index')
  , fs = require('fs')
  , tape = require('tape')

tape('form', function(t) {
  t.plan(18)

  var remoteFile = 'http://nodejs.org/images/logo.png'
    , totalLength = null
    , FIELDS = [
      { name: 'my_field', value: 'my_value' },
      { name: 'my_buffer', value: new Buffer([1, 2, 3]) },
      { name: 'my_file', value: fs.createReadStream(__dirname + '/unicycle.jpg') },
      { name: 'remote_file', value: request(remoteFile) }
    ]

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
      var field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf(field.value) !== -1 )

      // 2nd field : my_buffer
      var field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf(field.value) !== -1 )

      // 3rd field : my_file
      var field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf('; filename="' + path.basename(field.value.path) + '"') !== -1 )
      // check for unicycle.jpg traces
      t.ok( data.indexOf('2005:06:21 01:44:12') !== -1 )
      t.ok( data.indexOf('Content-Type: ' + mime.lookup(field.value.path) ) !== -1 )

      // 4th field : remote_file
      var field = FIELDS.shift()
      t.ok( data.indexOf('form-data; name="' + field.name + '"') !== -1 )
      t.ok( data.indexOf('; filename="' + path.basename(field.value.path) + '"') !== -1 )
      // check for http://nodejs.org/images/logo.png traces
      t.ok( data.indexOf('ImageReady') !== -1 )
      t.ok( data.indexOf('Content-Type: ' + mime.lookup(remoteFile) ) !== -1 )

      t.ok( +req.headers['content-length'] === totalLength )

      res.writeHead(200)
      res.end('done')

      t.equal(FIELDS.length, 0)
    })
  })

  server.listen(8080, function() {

    var req = request.post('http://localhost:8080/upload', function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close()
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
