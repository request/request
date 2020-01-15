'use strict'

const tape = require('tape')
const request = require('../../index')

tape('returns on error', t => {
  t.plan(1)
  request(
    {
      uri: 'https://stupid.nonexistent.path:port123/\\<-great-idea',
      withCredentials: false
    },
    (error, response) => {
      t.equal(typeof error, 'object')
      t.end()
    }
  )
})

tape('succeeds on valid URLs (with https and CORS)', t => {
  t.plan(1)
  request(
    {
      uri: __karma__.config.requestTestUrl, // eslint-disable-line no-undef
      withCredentials: false
    },
    (_, response) => {
      t.equal(response.statusCode, 200)
      t.end()
    }
  )
})
