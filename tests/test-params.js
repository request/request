'use strict'

var server = require('./server')
var request = require('../index')
var tape = require('tape')

var s = server.createServer()

function runTest (name, test) {
  tape(name, function (t) {
    s.on('/' + name, test.resp)
    request(s.url + '/' + name, test, function (err, resp, body) {
      t.equal(err, null)
      if (test.expectBody) {
        if (Buffer.isBuffer(test.expectBody)) {
          t.equal(test.expectBody.toString(), body.toString())
        } else {
          t.deepEqual(test.expectBody, body)
        }
      }
      t.end()
    })
  })
}

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

runTest('testGet', {
  resp: server.createGetResponse('TESTING!'),
  expectBody: 'TESTING!'
})

runTest('testGetChunkBreak', {
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
  expectBody: '\uf8ff\u03a9\u2603'
})

runTest('testGetBuffer', {
  resp: server.createGetResponse(new Buffer('TESTING!')),
  encoding: null,
  expectBody: new Buffer('TESTING!')
})

runTest('testGetJSON', {
  resp: server.createGetResponse('{"test":true}', 'application/json'),
  json: true,
  expectBody: {'test': true}
})

runTest('testPutString', {
  resp: server.createPostValidator('PUTTINGDATA'),
  method: 'PUT',
  body: 'PUTTINGDATA'
})

runTest('testPutBuffer', {
  resp: server.createPostValidator('PUTTINGDATA'),
  method: 'PUT',
  body: new Buffer('PUTTINGDATA')
})

runTest('testPutJSON', {
  resp: server.createPostValidator(JSON.stringify({foo: 'bar'})),
  method: 'PUT',
  json: {foo: 'bar'}
})

runTest('testPutMultipart', {
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

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
