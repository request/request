'use strict'

const request = require('../index')
const server = require('./server')
const tape = require('tape')

const s = server.createServer()

const path = '/aws.json'

s.on(path, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  })
  res.end(JSON.stringify(req.headers))
})

tape('setup', (t) => {
  s.listen(0, () => {
    t.end()
  })
})

tape('default behaviour: aws-sign2 without sign_version key', (t) => {
  const options = {
    url: s.url + path,
    aws: {
      key: 'my_key',
      secret: 'my_secret'
    },
    json: true
  }
  request(options, (err, res, body) => {
    t.error(err)
    t.ok(body.authorization)
    t.notOk(body['x-amz-date'])
    t.end()
  })
})

tape('aws-sign4 options', (t) => {
  const options = {
    url: s.url + path,
    aws: {
      key: 'my_key',
      secret: 'my_secret',
      sign_version: 4
    },
    json: true
  }
  request(options, (err, res, body) => {
    t.error(err)
    t.ok(body.authorization)
    t.ok(body['x-amz-date'])
    t.notok(body['x-amz-security-token'])
    t.end()
  })
})

tape('aws-sign4 options with session token', (t) => {
  const options = {
    url: s.url + path,
    aws: {
      key: 'my_key',
      secret: 'my_secret',
      session: 'session',
      sign_version: 4
    },
    json: true
  }
  request(options, (err, res, body) => {
    t.error(err)
    t.ok(body.authorization)
    t.ok(body['x-amz-date'])
    t.ok(body['x-amz-security-token'])
    t.end()
  })
})

tape('aws-sign4 options with service', (t) => {
  const serviceName = 'UNIQUE_SERVICE_NAME'
  const options = {
    url: s.url + path,
    aws: {
      key: 'my_key',
      secret: 'my_secret',
      sign_version: 4,
      service: serviceName
    },
    json: true
  }
  request(options, (err, res, body) => {
    t.error(err)
    t.ok(body.authorization.includes(serviceName))
    t.end()
  })
})

tape('aws-sign4 with additional headers', (t) => {
  const options = {
    url: s.url + path,
    headers: {
      'X-Custom-Header': 'custom'
    },
    aws: {
      key: 'my_key',
      secret: 'my_secret',
      sign_version: 4
    },
    json: true
  }
  request(options, (err, res, body) => {
    t.error(err)
    t.ok(body.authorization.includes('x-custom-header'))
    t.end()
  })
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
