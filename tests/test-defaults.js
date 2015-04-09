'use strict'

var server = require('./server')
  , assert = require('assert')
  , request = require('../index')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    s.on('/get', function(req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.method, 'GET')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end('TESTING!')
    })

    s.on('/merge-headers', function (req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.headers.merged, 'yes')
      resp.writeHead(200)
      resp.end()
    })

    s.on('/foo-no-test', function(req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal('test' in req.headers, false)
      assert.equal(req.method, 'GET')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end('TESTING!')
    })

    s.on('/post', function (req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.headers['content-type'], null)
      assert.equal(req.method, 'POST')
      resp.writeHead(200, {'Content-Type': 'application/json'})
      resp.end(JSON.stringify({foo:'bar'}))
    })

    s.on('/patch', function (req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.headers['content-type'], null)
      assert.equal(req.method, 'PATCH')
      resp.writeHead(200, {'Content-Type': 'application/json'})
      resp.end(JSON.stringify({foo:'bar'}))
    })

    s.on('/post-body', function (req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.headers['content-type'], 'application/json')
      assert.equal(req.method, 'POST')
      resp.writeHead(200, {'Content-Type': 'application/json'})
      resp.end(JSON.stringify({foo:'bar'}))
    })

    s.on('/del', function (req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.method, 'DELETE')
      resp.writeHead(200, {'Content-Type': 'application/json'})
      resp.end(JSON.stringify({foo:'bar'}))
    })

    s.on('/head', function (req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.method, 'HEAD')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end()
    })

    s.on('/get_recursive1', function (req, resp) {
      assert.equal(req.headers.foo, 'bar1')
      assert.equal(req.method, 'GET')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end('TESTING!')
    })

    s.on('/get_recursive2', function (req, resp) {
      assert.equal(req.headers.foo, 'bar1')
      assert.equal(req.headers.baz, 'bar2')
      assert.equal(req.method, 'GET')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end('TESTING!')
    })

    s.on('/get_recursive3', function (req, resp) {
      assert.equal(req.headers.foo, 'bar3')
      assert.equal(req.headers.baz, 'bar2')
      assert.equal(req.method, 'GET')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end('TESTING!')
    })

    s.on('/get_custom', function(req, resp) {
      assert.equal(req.headers.foo, 'bar')
      assert.equal(req.headers.x, 'y')
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end()
    })

    s.on('/set-undefined', function (req, resp) {
      assert.equal(req.method, 'POST')
      assert.equal(req.headers['content-type'], 'application/json')
      assert.equal(req.headers['x-foo'], 'baz')
      var data = ''
      req.on('data', function(d) {
        data += d
      })
      req.on('end', function() {
        resp.writeHead(200, {'Content-Type': 'application/json'})
        resp.end(data)
      })
    })

    s.on('/function', function(req, resp) {
      resp.writeHead(200, {'Content-Type': 'text/plain'})
      resp.end()
    })

    t.end()
  })
})

tape('get(string, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  })(s.url + '/get', function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
    t.end()
  })
})

tape('merge headers', function(t) {
  request.defaults({
    headers: { foo: 'bar', merged: 'no' }
  })(s.url + '/merge-headers', {
    headers: { merged: 'yes' }
  }, function (e, r, b) {
    t.equal(e, null)
    t.equal(r.statusCode, 200)
    t.end()
  })
})

tape('default undefined header', function(t) {
  request.defaults({
    headers: { foo: 'bar', test: undefined }
  })(s.url + '/foo-no-test', function(e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
    t.end()
  })
})

tape('post(string, object, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).post(s.url + '/post', { json: true }, function (e, r, b) {
    t.equal(e, null)
    t.equal(b.foo, 'bar')
    t.end()
  })
})

tape('patch(string, object, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).patch(s.url + '/patch', { json: true }, function (e, r, b) {
    t.equal(e, null)
    t.equal(b.foo, 'bar')
    t.end()
  })
})

tape('post(string, object, function) with body', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).post(s.url + '/post-body', {
    json: true,
    body: { bar: 'baz' }
  }, function (e, r, b) {
    t.equal(e, null)
    t.equal(b.foo, 'bar')
    t.end()
  })
})

tape('del(string, function)', function(t) {
  request.defaults({
    headers: {foo: 'bar'},
    json: true
  }).del(s.url + '/del', function (e, r, b) {
    t.equal(e, null)
    t.equal(b.foo, 'bar')
    t.end()
  })
})

tape('head(object, function)', function(t) {
  request.defaults({
    headers: { foo: 'bar' }
  }).head({ uri: s.url + '/head' }, function (e, r, b) {
    t.equal(e, null)
    t.end()
  })
})

tape('recursive defaults', function(t) {
  t.plan(6)

  var defaultsOne = request.defaults({ headers: { foo: 'bar1' } })
    , defaultsTwo = defaultsOne.defaults({ headers: { baz: 'bar2' } })
    , defaultsThree = defaultsTwo.defaults({}, function(options, callback) {
      options.headers = {
        foo: 'bar3'
      }
      defaultsTwo(options, callback)
    })

  defaultsOne(s.url + '/get_recursive1', function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
  })

  defaultsTwo(s.url + '/get_recursive2', function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
  })

  // requester function on recursive defaults
  defaultsThree(s.url + '/get_recursive3', function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
  })
})

tape('recursive defaults requester', function(t) {
  t.plan(4)

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

  defaultsOne.get(s.url + '/get_recursive1', function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
  })

  defaultsTwo.get(s.url + '/get_recursive2', function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
  })
})

tape('test custom request handler function', function(t) {
  t.plan(2)

  var requestWithCustomHandler = request.defaults({
    headers: { foo: 'bar' },
    body: 'TESTING!'
  }, function(uri, options, callback) {
    var params = request.initParams(uri, options, callback)
    params.headers.x = 'y'
    return request(params.uri, params, params.callback)
  })

  t.throws(function() {
    requestWithCustomHandler.head(s.url + '/get_custom', function(e, r, b) {
      throw new Error('We should never get here')
    })
  }, /HTTP HEAD requests MUST NOT include a request body/)

  requestWithCustomHandler.get(s.url + '/get_custom', function(e, r, b) {
    t.equal(e, null)
  })
})

tape('test custom request handler function without options', function(t) {
  t.plan(1)

  var customHandlerWithoutOptions = request.defaults(function(uri, options, callback) {
    var params = request.initParams(uri, options, callback)
    var headers = params.headers || {}
    headers.x = 'y'
    headers.foo = 'bar'
    params.headers = headers
    return request(params.uri, params, params.callback)
  })

  customHandlerWithoutOptions.get(s.url + '/get_custom', function(e, r, b) {
    t.equal(e, null)
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
    t.equal(e, null)
    t.deepEqual(b, { foo: 'bar' })
    t.end()
  })
})

tape('test only function', function(t) {
  var post = request.post
  t.doesNotThrow(function () {
    post(s.url + '/function', function (e, r, b) {
      t.equal(r.statusCode, 200)
      t.end()
    })
  })
})

tape('invoke defaults', function(t) {
  var d = request.defaults({
    uri: s.url + '/get',
    headers: { foo: 'bar' }
  })
  d({}, function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
    t.end()
  })
})

tape('invoke convenience method from defaults', function(t) {
  var d = request.defaults({
    uri: s.url + '/get',
    headers: { foo: 'bar' }
  })
  d.get({}, function (e, r, b) {
    t.equal(e, null)
    t.equal(b, 'TESTING!')
    t.end()
  })
})

tape('cleanup', function(t) {
  s.close(function() {
    t.end()
  })
})
