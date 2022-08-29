'use strict'

const request = require('../index')
const server = require('./server')
const tape = require('tape')

const s = server.createServer()

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

tape('re-emit formData errors', function (t) {
  s.on('/', function (req, res) {
    res.writeHead(400)
    res.end()
    t.fail('The form-data error did not abort the request.')
  })

  request.post(s.url, function (err, res, body) {
    t.equal(err.message, 'form-data: Arrays are not supported.')
    setTimeout(function () {
      t.end()
    }, 10)
  }).form().append('field', ['value1', 'value2'])
})

tape('omit content-length header if the value is set to NaN', function (t) {
  // returns chunked HTTP response which is streamed to the 2nd HTTP request in the form data
  s.on('/chunky', server.createChunkResponse(
    ['some string',
      'some other string'
    ]))

  // accepts form data request
  s.on('/stream', function (req, resp) {
    req.on('data', function (chunk) {
      // consume the request body
    })
    req.on('end', function () {
      resp.writeHead(200)
      resp.end()
    })
  })

  const sendStreamRequest = function (stream) {
    request.post({
      uri: s.url + '/stream',
      formData: {
        param: stream
      }
    }, function (err, res) {
      t.error(err, 'request failed')
      t.end()
    })
  }

  request.get({
    uri: s.url + '/chunky'
  }).on('response', function (res) {
    sendStreamRequest(res)
  })
})

// TODO: remove this test after form-data@2.0 starts stringifying null values
tape('form-data should throw on null value', function (t) {
  t.throws(function () {
    request({
      method: 'POST',
      url: s.url,
      formData: {
        key: null
      }
    })
  }, TypeError)
  t.end()
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
