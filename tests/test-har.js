'use strict'

const path = require('path')
const request = require('..')
const tape = require('tape')
const fixture = require('./fixtures/har.json')
const server = require('./server')

const s = server.createEchoServer()

tape('setup', t => {
  s.listen(0, () => {
    t.end()
  })
})

tape('application-form-encoded', t => {
  const options = {
    url: s.url,
    har: fixture['application-form-encoded']
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.body, 'foo=bar&hello=world')
    t.end()
  })
})

tape('application-json', t => {
  const options = {
    url: s.url,
    har: fixture['application-json']
  }

  request(options, (err, res, body) => {
    t.equal(err, null)
    t.equal(body.body, fixture['application-json'].postData.text)
    t.end()
  })
})

tape('cookies', t => {
  const options = {
    url: s.url,
    har: fixture.cookies
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.headers.cookie, 'foo=bar; bar=baz')
    t.end()
  })
})

tape('custom-method', t => {
  const options = {
    url: s.url,
    har: fixture['custom-method']
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.method, fixture['custom-method'].method)
    t.end()
  })
})

tape('headers', t => {
  const options = {
    url: s.url,
    har: fixture.headers
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.headers['x-foo'], 'Bar')
    t.end()
  })
})

tape('multipart-data', t => {
  const options = {
    url: s.url,
    har: fixture['multipart-data']
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.ok(~json.headers['content-type'].indexOf('multipart/form-data'))
    t.ok(
      ~json.body.indexOf(
        'Content-Disposition: form-data; name="foo"; filename="hello.txt"\r\nContent-Type: text/plain\r\n\r\nHello World'
      )
    )
    t.end()
  })
})

tape('multipart-file', t => {
  const options = {
    url: s.url,
    har: fixture['multipart-file']
  }
  const absolutePath = path.resolve(
    __dirname,
    options.har.postData.params[0].fileName
  )
  options.har.postData.params[0].fileName = absolutePath

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.ok(~json.headers['content-type'].indexOf('multipart/form-data'))
    t.ok(
      ~json.body.indexOf(
        'Content-Disposition: form-data; name="foo"; filename="unicycle.jpg"\r\nContent-Type: image/jpeg'
      )
    )
    t.end()
  })
})

tape('multipart-form-data', t => {
  const options = {
    url: s.url,
    har: fixture['multipart-form-data']
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.ok(~json.headers['content-type'].indexOf('multipart/form-data'))
    t.ok(~json.body.indexOf('Content-Disposition: form-data; name="foo"'))
    t.end()
  })
})

tape('query', t => {
  const options = {
    url: s.url + '/?fff=sss',
    har: fixture.query
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.url, '/?fff=sss&foo%5B0%5D=bar&foo%5B1%5D=baz&baz=abc')
    t.end()
  })
})

tape('text/plain', t => {
  const options = {
    url: s.url,
    har: fixture['text-plain']
  }

  request(options, (err, res, body) => {
    const json = JSON.parse(body)

    t.equal(err, null)
    t.equal(json.headers['content-type'], 'text/plain')
    t.equal(json.body, 'Hello World')
    t.end()
  })
})

tape('cleanup', t => {
  s.close(() => {
    t.end()
  })
})
