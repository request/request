'use strict'

const http = require('http')
const path = require('path')
const request = require('../index')
const fs = require('fs')
const tape = require('tape')

const localFile = path.join(__dirname, 'unicycle.jpg')
const cases = {
  // based on body type
  '+array -stream': {
    options: {
      multipart: [{name: 'field', body: 'value'}]
    },
    expected: {chunked: false}
  },
  '+array +stream': {
    options: {
      multipart: [{name: 'file', body: null}]
    },
    expected: {chunked: true}
  },
  // encoding overrides body value
  '+array +encoding': {
    options: {
      headers: {'transfer-encoding': 'chunked'},
      multipart: [{name: 'field', body: 'value'}]
    },
    expected: {chunked: true}
  },

  // based on body type
  '+object -stream': {
    options: {
      multipart: {data: [{name: 'field', body: 'value'}]}
    },
    expected: {chunked: false}
  },
  '+object +stream': {
    options: {
      multipart: {data: [{name: 'file', body: null}]}
    },
    expected: {chunked: true}
  },
  // encoding overrides body value
  '+object +encoding': {
    options: {
      headers: {'transfer-encoding': 'chunked'},
      multipart: {data: [{name: 'field', body: 'value'}]}
    },
    expected: {chunked: true}
  },

  // based on body type
  '+object -chunked -stream': {
    options: {
      multipart: {chunked: false, data: [{name: 'field', body: 'value'}]}
    },
    expected: {chunked: false}
  },
  '+object -chunked +stream': {
    options: {
      multipart: {chunked: false, data: [{name: 'file', body: null}]}
    },
    expected: {chunked: true}
  },
  // chunked overrides body value
  '+object +chunked -stream': {
    options: {
      multipart: {chunked: true, data: [{name: 'field', body: 'value'}]}
    },
    expected: {chunked: true}
  },
  // encoding overrides chunked
  '+object +encoding -chunked': {
    options: {
      headers: {'transfer-encoding': 'chunked'},
      multipart: {chunked: false, data: [{name: 'field', body: 'value'}]}
    },
    expected: {chunked: true}
  }
}

function runTest (t, test) {
  const server = http.createServer((req, res) => {
    t.ok(req.headers['content-type'].match(/^multipart\/related; boundary=[^\s;]+$/))

    if (test.expected.chunked) {
      t.ok(req.headers['transfer-encoding'] === 'chunked')
      t.notOk(req.headers['content-length'])
    } else {
      t.ok(req.headers['content-length'])
      t.notOk(req.headers['transfer-encoding'])
    }

    // temp workaround
    let data = ''
    req.setEncoding('utf8')

    req.on('data', (d) => {
      data += d
    })

    req.on('end', () => {
      // check for the fields traces
      if (test.expected.chunked && data.indexOf('name: file') !== -1) {
        // file
        t.ok(data.indexOf('name: file') !== -1)
        // check for unicycle.jpg traces
        t.ok(data.indexOf('2005:06:21 01:44:12') !== -1)
      } else {
        // field
        t.ok(data.indexOf('name: field') !== -1)
        const parts = test.options.multipart.data || test.options.multipart
        t.ok(data.indexOf(parts[0].body) !== -1)
      }

      res.writeHead(200)
      res.end()
    })
  })

  server.listen(0, function () {
    const url = 'http://localhost:' + this.address().port
    // @NOTE: multipartData properties must be set here
    // so that file read stream does not leak in node v0.8
    const parts = test.options.multipart.data || test.options.multipart
    if (parts[0].name === 'file') {
      parts[0].body = fs.createReadStream(localFile)
    }

    request.post(url, test.options, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      server.close(() => {
        t.end()
      })
    })
  })
}

Object.keys(cases).forEach((name) => {
  tape('multipart-encoding ' + name, (t) => {
    runTest(t, cases[name])
  })
})
