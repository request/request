'use strict'

var server = require('./server')
  , request = require('../index')
  , qs = require('qs')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    s.on('/', function (req, res) {
      res.writeHead(200, {'content-type': 'application/json'})
      res.end(JSON.stringify({
        method: req.method, headers: req.headers,
        qs: qs.parse(req.url.replace(/.*\?(.*)/, '$1'))
      }))
    })

    s.on('/head', function (req, res) {
      res.writeHead(200, {'x-data':
        JSON.stringify({method: req.method, headers: req.headers})})
      res.end()
    })

    s.on('/set-undefined', function (req, res) {
      var data = ''
      req.on('data', function(d) {
        data += d
      })
      req.on('end', function() {
        res.writeHead(200, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({
          method: req.method, headers: req.headers, data: JSON.parse(data)}))
      })
    })

    t.end()
  })
})

tape('get(string, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  })(s.url + '/', function (e, r, b) {
    b = JSON.parse(b)
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('merge headers', function(t) {
  request.defaults({
    headers: { foo: 'bar', merged: 'no' }
  })(s.url + '/', {
    headers: { merged: 'yes' }, json: true
  }, function (e, r, b) {
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.merged, 'yes')
    t.end()
  })
})

tape('deep extend', function(t) {
  request.defaults({
    headers: {a: 1, b: 2 },
    qs: { a: 1, b: 2 }
  })(s.url + '/', {
    headers: { b: 3, c: 4 },
    qs: { b: 3, c: 4 },
    json: true
  }, function (e, r, b) {
    delete b.headers.host
    delete b.headers.accept
    delete b.headers.connection
    t.deepEqual(b.headers, { a: '1', b: '3', c: '4' })
    t.deepEqual(b.qs, { a: '1', b: '3', c: '4' })
    t.end()
  })
})

tape('default undefined header', function(t) {
  request.defaults({
    headers: { foo: 'bar', test: undefined }, json: true
  })(s.url + '/', function(e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.test, undefined)
    t.end()
  })
})

tape('post(string, object, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).post(s.url + '/', { json: true }, function (e, r, b) {
    t.equal(b.method, 'POST')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers['content-type'], undefined)
    t.end()
  })
})

tape('patch(string, object, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).patch(s.url + '/', { json: true }, function (e, r, b) {
    t.equal(b.method, 'PATCH')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers['content-type'], undefined)
    t.end()
  })
})

tape('post(string, object, function) with body', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).post(s.url + '/', {
    json: true,
    body: { bar: 'baz' }
  }, function (e, r, b) {
    t.equal(b.method, 'POST')
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers['content-type'], 'application/json')
    t.end()
  })
})

tape('del(string, function)', function(t) {
  request.defaults({
    headers: {foo: 'bar'},
    json: true
  }).del(s.url + '/', function (e, r, b) {
    t.equal(b.method, 'DELETE')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('delete(string, function)', function(t) {
  request.defaults({
    headers: {foo: 'bar'},
    json: true
  }).delete(s.url + '/', function (e, r, b) {
    t.equal(b.method, 'DELETE')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('head(object, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).head({ uri: s.url + '/head' }, function (e, r, b) {
    b = JSON.parse(r.headers['x-data'])
    t.equal(b.method, 'HEAD')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('recursive defaults', function(t) {
  t.plan(11)

  var defaultsOne = request.defaults({ headers: { foo: 'bar1' } })
    , defaultsTwo = defaultsOne.defaults({ headers: { baz: 'bar2' } })
    , defaultsThree = defaultsTwo.defaults({}, function(options, callback) {
      options.headers = {
        foo: 'bar3'
      }
      defaultsTwo(options, callback)
    })

  defaultsOne(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
  })

  defaultsTwo(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
    t.equal(b.headers.baz, 'bar2')
  })

  // requester function on recursive defaults
  defaultsThree(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar3')
    t.equal(b.headers.baz, 'bar2')
  })

  defaultsTwo.get(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
    t.equal(b.headers.baz, 'bar2')
  })
})

tape('recursive defaults requester', function(t) {
  t.plan(5)

  var defaultsOne = request.defaults({}, function(options, callback) {
      var headers = options.headers || {}
      headers.foo = 'bar1'
      options.headers = headers

      request(options, callback)
    })
    , defaultsTwo = defaultsOne.defaults({}, function(options, callback) {
      var headers = options.headers || {}
      headers.baz = 'bar2'
      options.headers = headers

      defaultsOne(options, callback)
    })

  defaultsOne.get(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
  })

  defaultsTwo.get(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar1')
    t.equal(b.headers.baz, 'bar2')
  })
})

tape('test custom request handler function', function(t) {
  t.plan(3)

  var requestWithCustomHandler = request.defaults({
    headers: { foo: 'bar' },
    body: 'TESTING!'
  }, function(uri, options, callback) {
    var params = request.initParams(uri, options, callback)
    params.headers.x = 'y'
    return request(params.uri, params, params.callback)
  })

  t.throws(function() {
    requestWithCustomHandler.head(s.url + '/', function(e, r, b) {
      throw new Error('We should never get here')
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)

  requestWithCustomHandler.get(s.url + '/', function(e, r, b) {
    b = JSON.parse(b)
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.x, 'y')
  })
})

tape('test custom request handler function without options', function(t) {
  t.plan(2)

  var customHandlerWithoutOptions = request.defaults(function(uri, options, callback) {
    var params = request.initParams(uri, options, callback)
    var headers = params.headers || {}
    headers.x = 'y'
    headers.foo = 'bar'
    params.headers = headers
    return request(params.uri, params, params.callback)
  })

  customHandlerWithoutOptions.get(s.url + '/', function(e, r, b) {
    b = JSON.parse(b)
    t.equal(b.headers.foo, 'bar')
    t.equal(b.headers.x, 'y')
  })
})

tape('test only setting undefined properties', function(t) {
  request.defaults({
    method: 'post',
    json: true,
    headers: { 'x-foo': 'bar' }
  })({
    uri: s.url + '/set-undefined',
    json: {foo: 'bar'},
    headers: {'x-foo': 'baz'}
  }, function (e, r, b) {
    t.equal(b.method, 'POST')
    t.equal(b.headers['content-type'], 'application/json')
    t.equal(b.headers['x-foo'], 'baz')
    t.deepEqual(b.data, { foo: 'bar' })
    t.end()
  })
})

tape('test only function', function(t) {
  var post = request.post
  t.doesNotThrow(function () {
    post(s.url + '/', function (e, r, b) {
      t.equal(r.statusCode, 200)
      t.end()
    })
  })
})

tape('invoke defaults', function(t) {
  var d = request.defaults({
    uri: s.url + '/',
    headers: { foo: 'bar' }
  })
  d({json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('invoke convenience method from defaults', function(t) {
  var d = request.defaults({
    uri: s.url + '/',
    headers: { foo: 'bar' }
  })
  d.get({json: true}, function (e, r, b) {
    t.equal(b.method, 'GET')
    t.equal(b.headers.foo, 'bar')
    t.end()
  })
})

tape('defaults without options', function(t) {
  var d = request.defaults()
  d.get(s.url + '/', {json: true}, function (e, r, b) {
    t.equal(r.statusCode, 200)
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
