'use strict'

var http = require('http')
  , request = require('../index')
  , stream = require('stream')
  , tape = require('tape')

var testHeaders = 'multipart/related; boundary=XXX; type=text/xml; start="<root>"'

tape('Multipart/related error recovery', function(t) {
  var multipartData = []

  var server = http.createServer(function(req, res) {
    // Not called in reality, as error from stream is thrown before.
    req.setEncoding('utf8')

    req.on('end', function() {
      res.writeHead(200)
      res.end('done')
    })
  })

  server.listen(0, function() {
    var url = 'http://localhost:' + this.address().port

    // Build error stream that will throw an error
    var st = new stream.Readable
    st._read = function noop() {}
    st.push('SomeData')

    multipartData = [
      {name: 'some_text', body: 'someText'},
      {name: 'my_file', body: st}
    ]

    var reqOptions = {
      url: url + '/upload',
      multipart: multipartData,
      headers: {
        'content-type': testHeaders
      }
    }

    request.post(reqOptions, function (err, res, body) {
      t.equal(err, 'Some Error')
      t.equal(res, undefined)
      server.close(function() {
        t.end()
      })
    })

    st.emit('error', 'Some Error')
  })
})
