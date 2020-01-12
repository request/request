'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')
const destroyable = require('server-destroy')

const s = server.createServer()

destroyable(s)

tape('setup', (t) => {
  s.listen(0, () => {
    s.on('/options', (req, res) => {
      res.writeHead(200, {
        'x-original-method': req.method,
        allow: 'OPTIONS, GET, HEAD'
      })

      res.end()
    })

    t.end()
  })
})

tape('options(string, function)', (t) => {
  request.options(s.url + '/options', (err, res) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['x-original-method'], 'OPTIONS')
    t.end()
  })
})

tape('options(object, function)', (t) => {
  request.options({
    url: s.url + '/options',
    headers: { foo: 'bar' }
  }, (err, res) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(res.headers['x-original-method'], 'OPTIONS')
    t.end()
  })
})

tape('cleanup', (t) => {
  s.destroy(() => {
    t.end()
  })
})
