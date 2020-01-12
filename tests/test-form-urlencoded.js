'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

function runTest (t, options, index) {
  const server = http.createServer((req, res) => {
    if (index === 0 || index === 3) {
      t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded')
    } else {
      t.equal(req.headers['content-type'], 'application/x-www-form-urlencoded; charset=UTF-8')
    }
    t.equal(req.headers['content-length'], '21')
    t.equal(req.headers.accept, 'application/json')

    let data = ''
    req.setEncoding('utf8')

    req.on('data', (d) => {
      data += d
    })

    req.on('end', () => {
      t.equal(data, 'some=url&encoded=data')

      res.writeHead(200)
      res.end('done')
    })
  })

  server.listen(0, function () {
    const url = 'http://localhost:' + this.address().port
    const r = request.post(url, options, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'done')
      server.close(() => {
        t.end()
      })
    })
    if (!options.form && !options.body) {
      r.form({some: 'url', encoded: 'data'})
    }
  })
}

const cases = [
  {
    form: {some: 'url', encoded: 'data'},
    json: true
  },
  {
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    form: {some: 'url', encoded: 'data'},
    json: true
  },
  {
    headers: {'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'},
    body: 'some=url&encoded=data',
    json: true
  },
  {
    // body set via .form() method
    json: true
  }
]

cases.forEach((options, index) => {
  tape('application/x-www-form-urlencoded ' + index, (t) => {
    runTest(t, options, index)
  })
})
