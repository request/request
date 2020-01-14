'use strict'

const http = require('http')
const request = require('../index')
const tape = require('tape')

let validUrl
let malformedUrl
let invalidUrl

const server = http.createServer((req, res) => {
  if (req.url === '/valid') {
    res.setHeader('set-cookie', 'foo=bar')
  } else if (req.url === '/malformed') {
    res.setHeader('set-cookie', 'foo')
  } else if (req.url === '/invalid') {
    res.setHeader('set-cookie', 'foo=bar; Domain=foo.com')
  }
  res.end('okay')
})

tape('setup', t => {
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    validUrl = server.url + '/valid'
    malformedUrl = server.url + '/malformed'
    invalidUrl = server.url + '/invalid'
    t.end()
  })
})

tape('simple cookie creation', t => {
  const cookie = request.cookie('foo=bar')
  t.equals(cookie.key, 'foo')
  t.equals(cookie.value, 'bar')
  t.end()
})

tape('simple malformed cookie creation', t => {
  const cookie = request.cookie('foo')
  t.equals(cookie.key, '')
  t.equals(cookie.value, 'foo')
  t.end()
})

tape('after server sends a cookie', t => {
  const jar1 = request.jar()
  request(
    {
      method: 'GET',
      url: validUrl,
      jar: jar1
    },
    (error, response, body) => {
      t.equal(error, null)
      t.equal(jar1.getCookieString(validUrl), 'foo=bar')
      t.equal(body, 'okay')

      const cookies = jar1.getCookies(validUrl)
      t.equal(cookies.length, 1)
      t.equal(cookies[0].key, 'foo')
      t.equal(cookies[0].value, 'bar')
      t.end()
    }
  )
})

tape('after server sends a malformed cookie', t => {
  const jar = request.jar()
  request(
    {
      method: 'GET',
      url: malformedUrl,
      jar: jar
    },
    (error, response, body) => {
      t.equal(error, null)
      t.equal(jar.getCookieString(malformedUrl), 'foo')
      t.equal(body, 'okay')

      const cookies = jar.getCookies(malformedUrl)
      t.equal(cookies.length, 1)
      t.equal(cookies[0].key, '')
      t.equal(cookies[0].value, 'foo')
      t.end()
    }
  )
})

tape('after server sends a cookie for a different domain', t => {
  const jar2 = request.jar()
  request(
    {
      method: 'GET',
      url: invalidUrl,
      jar: jar2
    },
    (error, response, body) => {
      t.equal(error, null)
      t.equal(jar2.getCookieString(validUrl), '')
      t.deepEqual(jar2.getCookies(validUrl), [])
      t.equal(body, 'okay')
      t.end()
    }
  )
})

tape('make sure setCookie works', t => {
  const jar3 = request.jar()
  let err = null
  try {
    jar3.setCookie(request.cookie('foo=bar'), validUrl)
  } catch (e) {
    err = e
  }
  t.equal(err, null)
  const cookies = jar3.getCookies(validUrl)
  t.equal(cookies.length, 1)
  t.equal(cookies[0].key, 'foo')
  t.equal(cookies[0].value, 'bar')
  t.end()
})

tape('custom store', t => {
  const Store = function () {}
  const store = new Store()
  const jar = request.jar(store)
  t.equals(store, jar._jar.store)
  t.end()
})

tape('cleanup', t => {
  server.close(() => {
    t.end()
  })
})
