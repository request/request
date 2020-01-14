'use strict'

const server = require('./server')
const request = require('../index')
const util = require('util')
const tape = require('tape')
const os = require('os')

const interfaces = os.networkInterfaces()
const loopbackKeyTest =
  os.platform() === 'win32' ? /Loopback Pseudo-Interface/ : /lo/
const hasIPv6interface = Object.keys(interfaces).some(name => {
  return (
    loopbackKeyTest.test(name) &&
    interfaces[name].some(info => {
      return info.family === 'IPv6'
    })
  )
})

const s = server.createServer()

s.on('/redirect/from', (req, res) => {
  res.writeHead(301, {
    location: '/redirect/to'
  })
  res.end()
})

s.on('/redirect/to', (req, res) => {
  res.end('ok')
})

s.on('/headers.json', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json'
  })

  res.end(JSON.stringify(req.headers))
})

function runTest (name, path, requestObj, serverAssertFn) {
  tape(name, t => {
    s.on('/' + path, (req, res) => {
      serverAssertFn(t, req, res)
      res.writeHead(200)
      res.end()
    })
    requestObj.url = s.url + '/' + path
    request(requestObj, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.end()
    })
  })
}

function addTests () {
  runTest(
    '#125: headers.cookie with no cookie jar',
    'no-jar',
    { headers: { cookie: 'foo=bar' } },
    (t, req, res) => {
      t.equal(req.headers.cookie, 'foo=bar')
    }
  )

  const jar = request.jar()
  jar.setCookie('quux=baz', s.url)
  runTest(
    '#125: headers.cookie + cookie jar',
    'header-and-jar',
    { jar: jar, headers: { cookie: 'foo=bar' } },
    (t, req, res) => {
      t.equal(req.headers.cookie, 'foo=bar; quux=baz')
    }
  )

  const jar2 = request.jar()
  jar2.setCookie('quux=baz; Domain=foo.bar.com', s.url, { ignoreError: true })
  runTest(
    '#794: ignore cookie parsing and domain errors',
    'ignore-errors',
    { jar: jar2, headers: { cookie: 'foo=bar' } },
    (t, req, res) => {
      t.equal(req.headers.cookie, 'foo=bar')
    }
  )

  runTest(
    '#784: override content-type when json is used',
    'json',
    {
      json: true,
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=UTF-8' },
      body: { hello: 'my friend' }
    },
    (t, req, res) => {
      t.equal(req.headers['content-type'], 'application/json; charset=UTF-8')
    }
  )

  runTest(
    'neither headers.cookie nor a cookie jar is specified',
    'no-cookie',
    {},
    (t, req, res) => {
      t.equal(req.headers.cookie, undefined)
    }
  )
}

tape('setup', t => {
  s.listen(0, () => {
    addTests()
    tape('cleanup', t => {
      s.close(() => {
        t.end()
      })
    })
    t.end()
  })
})

tape('upper-case Host header and redirect', t => {
  // Horrible hack to observe the raw data coming to the server (before Node
  // core lower-cases the headers)
  let rawData = ''
  let ondata

  s.on('connection', socket => {
    if (socket.ondata) {
      ondata = socket.ondata
    }
    function handledata (d, start, end) {
      if (ondata) {
        rawData += d.slice(start, end).toString()
        return ondata.apply(this, arguments)
      } else {
        rawData += d
      }
    }
    socket.on('data', handledata)
    socket.ondata = handledata
  })

  function checkHostHeader (host) {
    t.ok(
      new RegExp('^Host: ' + host + '$', 'm').test(rawData),
      util.format(
        'Expected "Host: %s" in data "%s"',
        host,
        rawData.trim().replace(/\r?\n/g, '\\n')
      )
    )
    rawData = ''
  }

  let redirects = 0
  request(
    {
      url: s.url + '/redirect/from',
      headers: { Host: '127.0.0.1' }
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.equal(body, 'ok')
      t.equal(redirects, 1)
      // XXX should the host header change like this after a redirect?
      checkHostHeader('localhost:' + s.port)
      t.end()
    }
  ).on('redirect', function () {
    redirects++
    t.equal(this.uri.href, s.url + '/redirect/to')
    checkHostHeader('127.0.0.1')
  })
})

tape('undefined headers', t => {
  request(
    {
      url: s.url + '/headers.json',
      headers: {
        'X-TEST-1': 'test1',
        'X-TEST-2': undefined
      },
      json: true
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(body['x-test-1'], 'test1')
      t.equal(typeof body['x-test-2'], 'undefined')
      t.end()
    }
  )
})

tape('preserve port in host header if non-standard port', t => {
  const r = request(
    {
      url: s.url + '/headers.json'
    },
    (err, res, body) => {
      t.equal(err, null)
      t.equal(r.originalHost, 'localhost:' + s.port)
      t.end()
    }
  )
})

tape(
  'strip port in host header if explicit standard port (:80) & protocol (HTTP)',
  t => {
    const r = request(
      {
        url: 'http://localhost:80/headers.json'
      },
      (_err, res, body) => {
        t.equal(r.req.socket._host, 'localhost')
        t.end()
      }
    )
  }
)

tape(
  'strip port in host header if explicit standard port (:443) & protocol (HTTPS)',
  t => {
    const r = request(
      {
        url: 'https://localhost:443/headers.json'
      },
      (_err, res, body) => {
        t.equal(r.req.socket._host, 'localhost')
        t.end()
      }
    )
  }
)

tape(
  'strip port in host header if implicit standard port & protocol (HTTP)',
  t => {
    const r = request(
      {
        url: 'http://localhost/headers.json'
      },
      (_err, res, body) => {
        t.equal(r.req.socket._host, 'localhost')
        t.end()
      }
    )
  }
)

tape(
  'strip port in host header if implicit standard port & protocol (HTTPS)',
  t => {
    const r = request(
      {
        url: 'https://localhost/headers.json'
      },
      (_err, res, body) => {
        t.equal(r.req.socket._host, 'localhost')
        t.end()
      }
    )
  }
)

const isExpectedHeaderCharacterError = (headerName, err) => {
  return (
    err.message === 'The header content contains invalid characters' ||
    err.message === 'Invalid character in header content ["' + headerName + '"]'
  )
}

tape('catch invalid characters error - GET', t => {
  request(
    {
      url: s.url + '/headers.json',
      headers: {
        test: 'אבגד'
      }
    },
    (err, res, body) => {
      t.true(isExpectedHeaderCharacterError('test', err))
    }
  ).on('error', err => {
    t.true(isExpectedHeaderCharacterError('test', err))
    t.end()
  })
})

tape('catch invalid characters error - POST', t => {
  request(
    {
      method: 'POST',
      url: s.url + '/headers.json',
      headers: {
        test: 'אבגד'
      },
      body: 'beep'
    },
    (err, res, body) => {
      t.true(isExpectedHeaderCharacterError('test', err))
    }
  ).on('error', err => {
    t.true(isExpectedHeaderCharacterError('test', err))
    t.end()
  })
})

if (hasIPv6interface) {
  tape('IPv6 Host header', t => {
    // Horrible hack to observe the raw data coming to the server
    let rawData = ''
    let ondata

    s.on('connection', socket => {
      if (socket.ondata) {
        ondata = socket.ondata
      }
      function handledata (d, start, end) {
        if (ondata) {
          rawData += d.slice(start, end).toString()
          return ondata.apply(this, arguments)
        } else {
          rawData += d
        }
      }
      socket.on('data', handledata)
      socket.ondata = handledata
    })

    function checkHostHeader (host) {
      t.ok(
        new RegExp('^Host: ' + host + '$', 'im').test(rawData),
        util.format(
          'Expected "Host: %s" in data "%s"',
          host,
          rawData.trim().replace(/\r?\n/g, '\\n')
        )
      )
      rawData = ''
    }

    const url = new URL(s.url)
    url.hostname = '[::1]'
    request(
      {
        url: url.href + 'headers.json'
      },
      (err, res, body) => {
        t.equal(err, null)
        t.equal(res.statusCode, 200)
        checkHostHeader('\\[::1\\]:' + s.port)
        t.end()
      }
    )
  })
}
