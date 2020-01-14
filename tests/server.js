'use strict'

const fs = require('fs')
const http = require('http')
const path = require('path')
const https = require('https')
const stream = require('stream')
const assert = require('assert')

exports.createServer = () => {
  const s = http.createServer((req, resp) => {
    s.emit(req.url.replace(/(\?.*)/, ''), req, resp)
  })
  s.on('listening', function () {
    s.port = this.address().port
    s.url = 'http://localhost:' + s.port
  })
  s.port = 0
  s.protocol = 'http'
  return s
}

exports.createEchoServer = () => {
  const s = http.createServer((req, resp) => {
    let b = ''
    req.on('data', chunk => {
      b += chunk
    })
    req.on('end', () => {
      resp.writeHead(200, { 'content-type': 'application/json' })
      resp.write(
        JSON.stringify({
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: b
        })
      )
      resp.end()
    })
  })
  s.on('listening', function () {
    s.port = this.address().port
    s.url = 'http://localhost:' + s.port
  })
  s.port = 0
  s.protocol = 'http'
  return s
}

exports.createSSLServer = opts => {
  let i
  const options = {
    key: path.join(__dirname, 'ssl', 'test.key'),
    cert: path.join(__dirname, 'ssl', 'test.crt')
  }
  if (opts) {
    for (i in opts) {
      options[i] = opts[i]
    }
  }

  for (i in options) {
    if (i !== 'requestCert' && i !== 'rejectUnauthorized' && i !== 'ciphers') {
      options[i] = fs.readFileSync(options[i])
    }
  }

  const s = https.createServer(options, (req, resp) => {
    s.emit(req.url, req, resp)
  })
  s.on('listening', function () {
    s.port = this.address().port
    s.url = 'https://localhost:' + s.port
  })
  s.port = 0
  s.protocol = 'https'
  return s
}

exports.createPostStream = text => {
  const postStream = new stream.Stream()
  postStream.writeable = true
  postStream.readable = true
  setTimeout(() => {
    postStream.emit('data', Buffer.from(text))
    postStream.emit('end')
  }, 0)
  return postStream
}
exports.createPostValidator = (text, reqContentType) => {
  return (req, resp) => {
    let r = ''
    req.on('data', chunk => {
      r += chunk
    })
    req.on('end', () => {
      if (
        req.headers['content-type'] &&
        req.headers['content-type'].indexOf('boundary=') >= 0
      ) {
        const boundary = req.headers['content-type'].split('boundary=')[1]
        text = text.replace(/__BOUNDARY__/g, boundary)
      }
      assert.strictEqual(r, text)
      if (reqContentType) {
        assert.ok(req.headers['content-type'])
        assert.ok(~req.headers['content-type'].indexOf(reqContentType))
      }
      resp.writeHead(200, { 'content-type': 'text/plain' })
      resp.write(r)
      resp.end()
    })
  }
}
exports.createPostJSONValidator = (value, reqContentType) => {
  return (req, resp) => {
    let r = ''
    req.on('data', chunk => {
      r += chunk
    })
    req.on('end', () => {
      const parsedValue = JSON.parse(r)
      assert.deepStrictEqual(parsedValue, value)
      if (reqContentType) {
        assert.ok(req.headers['content-type'])
        assert.ok(~req.headers['content-type'].indexOf(reqContentType))
      }
      resp.writeHead(200, { 'content-type': 'application/json' })
      resp.write(r)
      resp.end()
    })
  }
}
exports.createGetResponse = (text, contentType) => {
  return (req, resp) => {
    contentType = contentType || 'text/plain'
    resp.writeHead(200, { 'content-type': contentType })
    resp.write(text)
    resp.end()
  }
}
exports.createChunkResponse = (chunks, contentType) => {
  return (req, resp) => {
    contentType = contentType || 'text/plain'
    resp.writeHead(200, { 'content-type': contentType })
    chunks.forEach(chunk => {
      resp.write(chunk)
    })
    resp.end()
  }
}
