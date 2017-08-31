'use strict'

var server = require('./server')
var request = require('../index')
var tape = require('tape')
var http = require('http')

var s = server.createServer()

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

function addTest (name, data) {
  tape('test ' + name, function (t) {
    s.on('/' + name, data.resp)
    data.uri = s.url + '/' + name
    request(data, function (err, resp, body) {
      t.equal(err, null)
      if (data.expectBody && Buffer.isBuffer(data.expectBody)) {
        t.deepEqual(data.expectBody.toString(), body.toString())
      } else if (data.expectBody) {
        t.deepEqual(data.expectBody, body)
      }
      t.end()
    })
  })
}

addTest('testGet', {
  resp: server.createGetResponse('TESTING!'), expectBody: 'TESTING!'
})

addTest('testGetChunkBreak', {
  resp: server.createChunkResponse(
    [ new Buffer([239]),
      new Buffer([163]),
      new Buffer([191]),
      new Buffer([206]),
      new Buffer([169]),
      new Buffer([226]),
      new Buffer([152]),
      new Buffer([131])
    ]),
  expectBody: '\uF8FF\u03A9\u2603'
})

addTest('testGetBuffer', {
  resp: server.createGetResponse(new Buffer('TESTING!')), encoding: null, expectBody: new Buffer('TESTING!')
})

addTest('testGetEncoding', {
  resp: server.createGetResponse(new Buffer('efa3bfcea9e29883', 'hex')), encoding: 'hex', expectBody: 'efa3bfcea9e29883'
})

addTest('testGetUTF', {
  resp: server.createGetResponse(new Buffer([0xEF, 0xBB, 0xBF, 226, 152, 131])), encoding: 'utf8', expectBody: '\u2603'
})

addTest('testGetJSON', {
  resp: server.createGetResponse('{"test":true}', 'application/json'), json: true, expectBody: {'test': true}
})

addTest('testPutString', {
  resp: server.createPostValidator('PUTTINGDATA'), method: 'PUT', body: 'PUTTINGDATA'
})

addTest('testPutBuffer', {
  resp: server.createPostValidator('PUTTINGDATA'), method: 'PUT', body: new Buffer('PUTTINGDATA')
})

addTest('testPutJSON', {
  resp: server.createPostValidator(JSON.stringify({foo: 'bar'})), method: 'PUT', json: {foo: 'bar'}
})

addTest('testPutMultipart', {
  resp: server.createPostValidator(
    '--__BOUNDARY__\r\n' +
    'content-type: text/html\r\n' +
    '\r\n' +
    '<html><body>Oh hi.</body></html>' +
    '\r\n--__BOUNDARY__\r\n\r\n' +
    'Oh hi.' +
    '\r\n--__BOUNDARY__--'
  ),
  method: 'PUT',
  multipart: [ {'content-type': 'text/html', 'body': '<html><body>Oh hi.</body></html>'},
    {'body': 'Oh hi.'}
  ]
})

addTest('testPutMultipartPreambleCRLF', {
  resp: server.createPostValidator(
    '\r\n--__BOUNDARY__\r\n' +
    'content-type: text/html\r\n' +
    '\r\n' +
    '<html><body>Oh hi.</body></html>' +
    '\r\n--__BOUNDARY__\r\n\r\n' +
    'Oh hi.' +
    '\r\n--__BOUNDARY__--'
  ),
  method: 'PUT',
  preambleCRLF: true,
  multipart: [ {'content-type': 'text/html', 'body': '<html><body>Oh hi.</body></html>'},
    {'body': 'Oh hi.'}
  ]
})

addTest('testPutMultipartPostambleCRLF', {
  resp: server.createPostValidator(
    '\r\n--__BOUNDARY__\r\n' +
    'content-type: text/html\r\n' +
    '\r\n' +
    '<html><body>Oh hi.</body></html>' +
    '\r\n--__BOUNDARY__\r\n\r\n' +
    'Oh hi.' +
    '\r\n--__BOUNDARY__--' +
    '\r\n'
  ),
  method: 'PUT',
  preambleCRLF: true,
  postambleCRLF: true,
  multipart: [ {'content-type': 'text/html', 'body': '<html><body>Oh hi.</body></html>'},
    {'body': 'Oh hi.'}
  ]
})

tape('typed array', function (t) {
  var server = http.createServer()
  server.on('request', function (req, res) {
    req.pipe(res)
  })
  server.listen(0, function () {
    var data = new Uint8Array([1, 2, 3])
    request({
      uri: 'http://localhost:' + this.address().port,
      method: 'POST',
      body: data,
      encoding: null
    }, function (err, res, body) {
      t.error(err)
      t.deepEqual(new Buffer(data), body)
      server.close(t.end)
    })
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
