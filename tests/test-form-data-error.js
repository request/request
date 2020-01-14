'use strict'

const request = require('../index')
const server = require('./server')
const tape = require('tape')

const s = server.createServer()

tape('setup', t => {
  s.listen(0, () => {
    t.end()
  })
})

tape('re-emit formData errors', t => {
  s.on('/', (req, res) => {
    res.writeHead(400)
    res.end()
    t.fail('The form-data error did not abort the request.')
  })

  request
    .post(s.url, (err, res, body) => {
      t.equal(err.message, 'form-data: Arrays are not supported.')
      setTimeout(() => {
        t.end()
      }, 10)
    })
    .form()
    .append('field', ['value1', 'value2'])
})

tape('omit content-length header if the value is set to NaN', t => {
  // returns chunked HTTP response which is streamed to the 2nd HTTP request in the form data
  s.on(
    '/chunky',
    server.createChunkResponse(['some string', 'some other string'])
  )

  // accepts form data request
  s.on('/stream', (req, resp) => {
    req.on('data', chunk => {
      // consume the request body
    })
    req.on('end', () => {
      resp.writeHead(200)
      resp.end()
    })
  })

  const sendStreamRequest = stream => {
    request.post(
      {
        uri: s.url + '/stream',
        formData: {
          param: stream
        }
      },
      (err, res) => {
        t.error(err, 'request failed')
        t.end()
      }
    )
  }

  request
    .get({
      uri: s.url + '/chunky'
    })
    .on('response', res => {
      sendStreamRequest(res)
    })
})

// TODO: remove this test after form-data@2.0 starts stringifying null values
tape('form-data should throw on null value', t => {
  t.throws(() => {
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

tape('cleanup', t => {
  s.close(() => {
    t.end()
  })
})
