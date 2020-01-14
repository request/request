'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')
const http = require('http')

const s = server.createServer()

tape('setup', t => {
  s.listen(0, () => {
    t.end()
  })
})

function addTest (name, data) {
  tape('test ' + name, t => {
    s.on('/' + name, data.resp)
    data.uri = s.url + '/' + name
    request(data, (err, resp, body) => {
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
  resp: server.createGetResponse('TESTING!'),
  expectBody: 'TESTING!'
})

addTest('testGetChunkBreak', {
  resp: server.createChunkResponse([
    Buffer.from([239]),
    Buffer.from([163]),
    Buffer.from([191]),
    Buffer.from([206]),
    Buffer.from([169]),
    Buffer.from([226]),
    Buffer.from([152]),
    Buffer.from([131])
  ]),
  expectBody: '\uF8FF\u03A9\u2603'
})

addTest('testGetBuffer', {
  resp: server.createGetResponse(Buffer.from('TESTING!')),
  encoding: null,
  expectBody: Buffer.from('TESTING!')
})

addTest('testGetEncoding', {
  resp: server.createGetResponse(Buffer.from('efa3bfcea9e29883', 'hex')),
  encoding: 'hex',
  expectBody: 'efa3bfcea9e29883'
})

addTest('testGetUTF', {
  resp: server.createGetResponse(
    Buffer.from([0xef, 0xbb, 0xbf, 226, 152, 131])
  ),
  encoding: 'utf8',
  expectBody: '\u2603'
})

addTest('testGetJSON', {
  resp: server.createGetResponse('{"test":true}', 'application/json'),
  json: true,
  expectBody: { test: true }
})

addTest('testPutString', {
  resp: server.createPostValidator('PUTTINGDATA'),
  method: 'PUT',
  body: 'PUTTINGDATA'
})

addTest('testPutBuffer', {
  resp: server.createPostValidator('PUTTINGDATA'),
  method: 'PUT',
  body: Buffer.from('PUTTINGDATA')
})

addTest('testPutJSON', {
  resp: server.createPostValidator(JSON.stringify({ foo: 'bar' })),
  method: 'PUT',
  json: { foo: 'bar' }
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
  multipart: [
    { 'content-type': 'text/html', body: '<html><body>Oh hi.</body></html>' },
    { body: 'Oh hi.' }
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
  multipart: [
    { 'content-type': 'text/html', body: '<html><body>Oh hi.</body></html>' },
    { body: 'Oh hi.' }
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
  multipart: [
    { 'content-type': 'text/html', body: '<html><body>Oh hi.</body></html>' },
    { body: 'Oh hi.' }
  ]
})

tape('typed array', t => {
  const server = http.createServer()
  server.on('request', (req, res) => {
    req.pipe(res)
  })
  server.listen(0, function () {
    const data = new Uint8Array([1, 2, 3])
    request(
      {
        uri: 'http://localhost:' + this.address().port,
        method: 'POST',
        body: data,
        encoding: null
      },
      (err, res, body) => {
        t.error(err)
        t.deepEqual(Buffer.from(data), body)
        server.close(t.end)
      }
    )
  })
})

tape('cleanup', t => {
  s.close(() => {
    t.end()
  })
})
