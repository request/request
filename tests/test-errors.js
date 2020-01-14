'use strict'

const request = require('../index')
const tape = require('tape')

const local = 'http://localhost:0/asdf'

tape('without uri', (t) => {
  t.throws(() => {
    request({})
  }, /^Error: options\.uri is a required argument$/)
  t.end()
})

tape('invalid uri 1', (t) => {
  t.throws(() => {
    request({
      uri: 'this-is-not-a-valid-uri'
    })
  }, /^TypeError \[ERR_INVALID_URL\]: Invalid URL/)
  t.end()
})

tape('invalid uri 2', (t) => {
  t.throws(() => {
    request({
      uri: 'github.com/uri-is-not-valid-without-protocol'
    })
  }, /^TypeError \[ERR_INVALID_URL\]: Invalid URL/)
  t.end()
})

tape('invalid uri + NO_PROXY', (t) => {
  process.env.NO_PROXY = 'google.com'
  t.throws(() => {
    request({
      uri: 'invalid'
    })
  }, /^TypeError \[ERR_INVALID_URL\]: Invalid URL/)
  delete process.env.NO_PROXY
  t.end()
})

tape('deprecated unix URL', (t) => {
  t.throws(() => {
    request({
      uri: 'unix://path/to/socket/and/then/request/path'
    })
  }, /^Error: `unix:\/\/` URL scheme is no longer supported/)
  t.end()
})

tape('invalid body', (t) => {
  t.throws(() => {
    request({
      uri: local, body: {}
    })
  }, /^Error: Argument error, options\.body\.$/)
  t.end()
})

tape('invalid multipart', (t) => {
  t.throws(() => {
    request({
      uri: local,
      multipart: 'foo'
    })
  }, /^Error: Argument error, options\.multipart\.$/)
  t.end()
})

tape('multipart without body 1', (t) => {
  t.throws(() => {
    request({
      uri: local,
      multipart: [{}]
    })
  }, /^Error: Body attribute missing in multipart\.$/)
  t.end()
})

tape('multipart without body 2', (t) => {
  t.throws(() => {
    request(local, {
      multipart: [{}]
    })
  }, /^Error: Body attribute missing in multipart\.$/)
  t.end()
})

tape('head method with a body', (t) => {
  t.throws(() => {
    request(local, {
      method: 'HEAD',
      body: 'foo'
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)
  t.end()
})

tape('head method with a body 2', (t) => {
  t.throws(() => {
    request.head(local, {
      body: 'foo'
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)
  t.end()
})
