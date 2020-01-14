'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

const s = http.createServer((req, res) => {
  res.statusCode = 200
  res.end('ok')
})

tape('setup', t => {
  s.listen(0, function () {
    s.port = this.address().port
    s.url = 'http://localhost:' + s.port
    t.end()
  })
})

tape('lowercase', t => {
  request(s.url, (err, resp, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('uppercase', t => {
  request(s.url.replace('http', 'HTTP'), (err, resp, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('mixedcase', t => {
  request(s.url.replace('http', 'HtTp'), (err, resp, body) => {
    t.equal(err, null)
    t.equal(body, 'ok')
    t.end()
  })
})

tape('hostname and port', t => {
  request(
    {
      uri: {
        protocol: 'http:',
        hostname: 'localhost',
        port: s.port
      }
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.end()
    }
  )
})

tape('hostname and port 1', t => {
  request(
    {
      uri: {
        protocol: 'http:',
        hostname: 'localhost',
        port: s.port
      }
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.end()
    }
  )
})

tape('hostname and port 2', t => {
  request(
    {
      protocol: 'http:',
      hostname: 'localhost',
      port: s.port
    },
    {
      // need this empty options object, otherwise request thinks no uri was set
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.end()
    }
  )
})

tape('hostname and port 3', t => {
  request(
    {
      protocol: 'http:',
      hostname: 'localhost',
      port: s.port
    },
    (err, res, body) => {
      t.notEqual(err, null)
      t.equal(err.message, 'options.uri is a required argument')
      t.equal(body, undefined)
      t.end()
    }
  )
})

tape('hostname and query string', t => {
  request(
    {
      uri: {
        protocol: 'http:',
        hostname: 'localhost',
        port: s.port
      },
      qs: {
        test: 'test'
      }
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(body, 'ok')
      t.end()
    }
  )
})

tape('cleanup', t => {
  s.close(() => {
    t.end()
  })
})
