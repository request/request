'use strict'

const server = require('./server')
const request = require('../index')
const qs = require('qs')
const tape = require('tape')

const s = server.createServer()

tape('setup', (t) => {
  s.listen(0, () => {
    s.on('/', (req, res) => {
      res.writeHead(200, {'content-type': 'application/json'})
      res.end(JSON.stringify({
        method: req.method,
        headers: req.headers,
        qs: qs.parse(req.url.replace(/.*\?(.*)/, '$1'))
      }))
    })

    s.on('/head', (req, res) => {
      res.writeHead(200, {'x-data': JSON.stringify({method: req.method, headers: req.headers})})
      res.end()
    })

    s.on('/set-undefined', (req, res) => {
      let data = ''
      req.on('data', (d) => {
        data += d
      })
      req.on('end', () => {
        res.writeHead(200, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({
          method: req.method, headers: req.headers, data: JSON.parse(data)
        }))
      })
    })

    t.end()
  })
})

tape('get(string, function)', (t) => {
  request.defaults({
    headers: { foo: 'bar' }
  })(s.url + '/', (e, r, b) => {
    b = JSON.parse(b)
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('merge headers', (t) => {
  request.defaults({
    headers: { foo: 'bar', merged: 'no' }
  })(s.url + '/', {
    headers: { merged: 'yes' }, json: true
  }, (e, r, b) => {
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.merged, 'yes')
    t.end()
  })
})

tape('deep extend', (t) => {
  request.defaults({
    headers: { a: 1, b: 2 },
    qs: { a: 1, b: 2 }
  })(s.url + '/', {
    headers: { b: 3, c: 4 },
    qs: { b: 3, c: 4 },
    json: true
  }, (e, r, b) => {
    delete b.headers.host
    delete b.headers.accept
    delete b.headers.connection
    t.deepEqual(b.headers, { a: '1', b: '3', c: '4' })
    t.deepEqual(b.qs, { a: '1', b: '3', c: '4' })
    t.end()
  })
})

tape('default undefined header', (t) => {
  request.defaults({
    headers: { foo: 'bar', test: undefined }, json: true
  })(s.url + '/', (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.test, undefined)
    t.end()
  })
})

tape('post(string, object, function)', (t) => {
  request.defaults({
    headers: { foo: 'bar' }
  }).post(s.url + '/', { json: true }, (e, r, b) => {
    t.equal(b.method, 'POST')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers['content-type'], undefined)
    t.end()
  })
})

tape('patch(string, object, function)', (t) => {
  request.defaults({
    headers: { foo: 'bar' }
  }).patch(s.url + '/', { json: true }, (e, r, b) => {
    t.equal(b.method, 'PATCH')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers['content-type'], undefined)
    t.end()
  })
})

tape('post(string, object, function) with body', (t) => {
  request.defaults({
    headers: { foo: 'bar' }
  }).post(s.url + '/', {
    json: true,
    body: { bar: 'baz' }
  }, (e, r, b) => {
    t.equal(b.method, 'POST')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers['content-type'], 'application/json')
    t.end()
  })
})

tape('del(string, function)', (t) => {
  request.defaults({
    headers: {foo: 'bar'},
    json: true
  }).del(s.url + '/', (e, r, b) => {
    t.equal(b.method, 'DELETE')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('delete(string, function)', (t) => {
  request.defaults({
    headers: {foo: 'bar'},
    json: true
  }).delete(s.url + '/', (e, r, b) => {
    t.equal(b.method, 'DELETE')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('head(object, function)', (t) => {
  request.defaults({
    headers: { foo: 'bar' }
  }).head({ uri: s.url + '/head' }, (e, r, b) => {
    b = JSON.parse(r.headers['x-data'])
    t.equal(b.method, 'HEAD')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('recursive defaults', (t) => {
  t.plan(11)

  const defaultsOne = request.defaults({ headers: { foo: 'bar1' } })
  const defaultsTwo = defaultsOne.defaults({ headers: { baz: 'bar2' } })
  const defaultsThree = defaultsTwo.defaults({}, (options, callback) => {
    options.headers = {
      foo: 'bar3'
    }
    defaultsTwo(options, callback)
  })

  defaultsOne(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
  })

  defaultsTwo(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
    t.equal(b.headers.baz, 'bar2')
  })

  // requester function on recursive defaults
  defaultsThree(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar3')
    t.equal(b.headers.baz, 'bar2')
  })

  defaultsTwo.get(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
    t.equal(b.headers.baz, 'bar2')
  })
})

tape('recursive defaults requester', (t) => {
  t.plan(5)

  const defaultsOne = request.defaults({}, (options, callback) => {
    const headers = options.headers || {}
    headers.foo = 'bar1'
    options.headers = headers

    request(options, callback)
  })

  const defaultsTwo = defaultsOne.defaults({}, (options, callback) => {
    const headers = options.headers || {}
    headers.baz = 'bar2'
    options.headers = headers

    defaultsOne(options, callback)
  })

  defaultsOne.get(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
  })

  defaultsTwo.get(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
    t.equal(b.headers.baz, 'bar2')
  })
})

tape('test custom request handler function', (t) => {
  t.plan(3)

  const requestWithCustomHandler = request.defaults({
    headers: { foo: 'bar' },
    body: 'TESTING!'
  }, (uri, options, callback) => {
    const params = request.initParams(uri, options, callback)
    params.headers.x = 'y'
    return request(params.uri, params, params.callback)
  })

  t.throws(() => {
    requestWithCustomHandler.head(s.url + '/', (e, r, b) => {
      throw new Error('We should never get here')
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)

  requestWithCustomHandler.get(s.url + '/', (e, r, b) => {
    b = JSON.parse(b)
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.x, 'y')
  })
})

tape('test custom request handler function without options', (t) => {
  t.plan(2)

  const customHandlerWithoutOptions = request.defaults((uri, options, callback) => {
    const params = request.initParams(uri, options, callback)
    const headers = params.headers || {}
    headers.x = 'y'
    headers.foo = 'bar'
    params.headers = headers
    return request(params.uri, params, params.callback)
  })

  customHandlerWithoutOptions.get(s.url + '/', (e, r, b) => {
    b = JSON.parse(b)
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.x, 'y')
  })
})

tape('test only setting undefined properties', (t) => {
  request.defaults({
    method: 'post',
    json: true,
    headers: { 'x-foo': 'bar' }
  })({
    uri: s.url + '/set-undefined',
    json: {foo: 'bar'},
    headers: {'x-foo': 'baz'}
  }, (e, r, b) => {
    t.equal(b.method, 'POST')
    t.equal(b.headers['content-type'], 'application/json')
    t.equal(b.headers['x-foo'], 'baz')
    t.deepEqual(b.data, { foo: 'bar' })
    t.end()
  })
})

tape('test only function', (t) => {
  const post = request.post
  t.doesNotThrow(() => {
    post(s.url + '/', (e, r, b) => {
      t.equal(r.statusCode, 200)
      t.end()
    })
  })
})

tape('invoke defaults', (t) => {
  const d = request.defaults({
    uri: s.url + '/',
    headers: { foo: 'bar' }
  })
  d({json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('invoke convenience method from defaults', (t) => {
  const d = request.defaults({
    uri: s.url + '/',
    headers: { foo: 'bar' }
  })
  d.get({json: true}, (e, r, b) => {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('defaults without options', (t) => {
  const d = request.defaults()
  d.get(s.url + '/', {json: true}, (e, r, b) => {
    t.equal(r.statusCode, 200)
    t.end()
  })
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
