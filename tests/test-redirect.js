'use strict'

const server = require('./server')
const assert = require('assert')
const request = require('../index')
const tape = require('tape')
const http = require('http')
const destroyable = require('server-destroy')

const s = server.createServer()
const ss = server.createSSLServer()
let hits = {}
const jar = request.jar()

destroyable(s)
destroyable(ss)

s.on('/ssl', (req, res) => {
  res.writeHead(302, {
    location: ss.url + '/'
  })
  res.end()
})

ss.on('/', (req, res) => {
  res.writeHead(200)
  res.end('SSL')
})

function createRedirectEndpoint (code, label, landing) {
  s.on('/' + label, (req, res) => {
    hits[label] = true
    res.writeHead(code, {
      'location': s.url + '/' + landing,
      'set-cookie': 'ham=eggs'
    })
    res.end()
  })
}

function createLandingEndpoint (landing) {
  s.on('/' + landing, (req, res) => {
    // Make sure the cookie doesn't get included twice, see #139:
    // Make sure cookies are set properly after redirect
    assert.equal(req.headers.cookie, 'foo=bar; quux=baz; ham=eggs')
    hits[landing] = true
    res.writeHead(200, {'x-response': req.method.toUpperCase() + ' ' + landing})
    res.end(req.method.toUpperCase() + ' ' + landing)
  })
}

function bouncer (code, label, hops) {
  let hop
  const landing = label + '_landing'
  let currentLabel
  let currentLanding

  hops = hops || 1

  if (hops === 1) {
    createRedirectEndpoint(code, label, landing)
  } else {
    for (hop = 0; hop < hops; hop++) {
      currentLabel = (hop === 0) ? label : label + '_' + (hop + 1)
      currentLanding = (hop === hops - 1) ? landing : label + '_' + (hop + 2)

      createRedirectEndpoint(code, currentLabel, currentLanding)
    }
  }

  createLandingEndpoint(landing)
}

tape('setup', (t) => {
  s.listen(0, () => {
    ss.listen(0, () => {
      bouncer(301, 'temp')
      bouncer(301, 'double', 2)
      bouncer(301, 'treble', 3)
      bouncer(302, 'perm')
      bouncer(302, 'nope')
      bouncer(307, 'fwd')
      t.end()
    })
  })
})

tape('permanent bounce', (t) => {
  jar.setCookie('quux=baz', s.url)
  hits = {}
  request({
    uri: s.url + '/perm',
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.perm, 'Original request is to /perm')
    t.ok(hits.perm_landing, 'Forward to permanent landing URL')
    t.equal(body, 'GET perm_landing', 'Got permanent landing content')
    t.end()
  })
})

tape('preserve HEAD method when using followAllRedirects', (t) => {
  jar.setCookie('quux=baz', s.url)
  hits = {}
  request({
    method: 'HEAD',
    uri: s.url + '/perm',
    followAllRedirects: true,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.perm, 'Original request is to /perm')
    t.ok(hits.perm_landing, 'Forward to permanent landing URL')
    t.equal(res.headers['x-response'], 'HEAD perm_landing', 'Got permanent landing content')
    t.end()
  })
})

tape('temporary bounce', (t) => {
  hits = {}
  request({
    uri: s.url + '/temp',
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(hits.temp_landing, 'Forward to temporary landing URL')
    t.equal(body, 'GET temp_landing', 'Got temporary landing content')
    t.end()
  })
})

tape('prevent bouncing', (t) => {
  hits = {}
  request({
    uri: s.url + '/nope',
    jar: jar,
    headers: { cookie: 'foo=bar' },
    followRedirect: false
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 302)
    t.ok(hits.nope, 'Original request to /nope')
    t.ok(!hits.nope_landing, 'No chasing the redirect')
    t.equal(res.statusCode, 302, 'Response is the bounce itself')
    t.end()
  })
})

tape('should not follow post redirects by default', (t) => {
  hits = {}
  request.post(s.url + '/temp', {
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 301)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(!hits.temp_landing, 'No chasing the redirect when post')
    t.equal(res.statusCode, 301, 'Response is the bounce itself')
    t.end()
  })
})

tape('should follow post redirects when followallredirects true', (t) => {
  hits = {}
  request.post({
    uri: s.url + '/temp',
    followAllRedirects: true,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(hits.temp_landing, 'Forward to temporary landing URL')
    t.equal(body, 'GET temp_landing', 'Got temporary landing content')
    t.end()
  })
})

tape('should follow post redirects when followallredirects true and followOriginalHttpMethod is enabled', (t) => {
  hits = {}
  request.post({
    uri: s.url + '/temp',
    followAllRedirects: true,
    followOriginalHttpMethod: true,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(hits.temp_landing, 'Forward to temporary landing URL')
    t.equal(body, 'POST temp_landing', 'Got temporary landing content')
    t.end()
  })
})

tape('should not follow post redirects when followallredirects false', (t) => {
  hits = {}
  request.post({
    uri: s.url + '/temp',
    followAllRedirects: false,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 301)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(!hits.temp_landing, 'No chasing the redirect')
    t.equal(res.statusCode, 301, 'Response is the bounce itself')
    t.end()
  })
})

tape('should not follow delete redirects by default', (t) => {
  hits = {}
  request.del(s.url + '/temp', {
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.ok(res.statusCode >= 301 && res.statusCode < 400, 'Status is a redirect')
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(!hits.temp_landing, 'No chasing the redirect when delete')
    t.equal(res.statusCode, 301, 'Response is the bounce itself')
    t.end()
  })
})

tape('should not follow delete redirects even if followredirect is set to true', (t) => {
  hits = {}
  request.del(s.url + '/temp', {
    followRedirect: true,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 301)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(!hits.temp_landing, 'No chasing the redirect when delete')
    t.equal(res.statusCode, 301, 'Response is the bounce itself')
    t.end()
  })
})

tape('should follow delete redirects when followallredirects true', (t) => {
  hits = {}
  request.del(s.url + '/temp', {
    followAllRedirects: true,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.temp, 'Original request is to /temp')
    t.ok(hits.temp_landing, 'Forward to temporary landing URL')
    t.equal(body, 'GET temp_landing', 'Got temporary landing content')
    t.end()
  })
})

tape('should follow 307 delete redirects when followallredirects true', (t) => {
  hits = {}
  request.del(s.url + '/fwd', {
    followAllRedirects: true,
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.fwd, 'Original request is to /fwd')
    t.ok(hits.fwd_landing, 'Forward to temporary landing URL')
    t.equal(body, 'DELETE fwd_landing', 'Got temporary landing content')
    t.end()
  })
})

tape('double bounce', (t) => {
  hits = {}
  request({
    uri: s.url + '/double',
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.ok(hits.double, 'Original request is to /double')
    t.ok(hits.double_2, 'Forward to temporary landing URL')
    t.ok(hits.double_landing, 'Forward to landing URL')
    t.equal(body, 'GET double_landing', 'Got temporary landing content')
    t.end()
  })
})

tape('double bounce terminated after first redirect', (t) => {
  function filterDouble (response) {
    return (response.headers.location || '').indexOf('double_2') === -1
  }

  hits = {}
  request({
    uri: s.url + '/double',
    jar: jar,
    headers: { cookie: 'foo=bar' },
    followRedirect: filterDouble
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 301)
    t.ok(hits.double, 'Original request is to /double')
    t.equal(res.headers.location, s.url + '/double_2', 'Current location should be ' + s.url + '/double_2')
    t.end()
  })
})

tape('triple bounce terminated after second redirect', (t) => {
  function filterTreble (response) {
    return (response.headers.location || '').indexOf('treble_3') === -1
  }

  hits = {}
  request({
    uri: s.url + '/treble',
    jar: jar,
    headers: { cookie: 'foo=bar' },
    followRedirect: filterTreble
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 301)
    t.ok(hits.treble, 'Original request is to /treble')
    t.equal(res.headers.location, s.url + '/treble_3', 'Current location should be ' + s.url + '/treble_3')
    t.end()
  })
})

tape('http to https redirect', (t) => {
  hits = {}
  request.get({
    uri: require('url').parse(s.url + '/ssl'),
    rejectUnauthorized: false
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'SSL', 'Got SSL redirect')
    t.end()
  })
})

tape('should have referer header by default when following redirect', (t) => {
  request.post({
    uri: s.url + '/temp',
    jar: jar,
    followAllRedirects: true,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.end()
  })
  .on('redirect', function () {
    t.equal(this.headers.referer, s.url + '/temp')
  })
})

tape('should not have referer header when removeRefererHeader is true', (t) => {
  request.post({
    uri: s.url + '/temp',
    jar: jar,
    followAllRedirects: true,
    removeRefererHeader: true,
    headers: { cookie: 'foo=bar' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.end()
  })
  .on('redirect', function () {
    t.equal(this.headers.referer, undefined)
  })
})

tape('should preserve referer header set in the initial request when removeRefererHeader is true', (t) => {
  request.post({
    uri: s.url + '/temp',
    jar: jar,
    followAllRedirects: true,
    removeRefererHeader: true,
    headers: { cookie: 'foo=bar', referer: 'http://awesome.com' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.end()
  })
  .on('redirect', function () {
    t.equal(this.headers.referer, 'http://awesome.com')
  })
})

tape('should use same agent class on redirect', (t) => {
  let agent
  let calls = 0
  const agentOptions = {}

  function FakeAgent (agentOptions) {
    let createConnection

    agent = new http.Agent(agentOptions)
    createConnection = agent.createConnection
    agent.createConnection = function () {
      calls++
      return createConnection.apply(agent, arguments)
    }

    return agent
  }

  hits = {}
  request.get({
    uri: s.url + '/temp',
    jar: jar,
    headers: { cookie: 'foo=bar' },
    agentOptions: agentOptions,
    agentClass: FakeAgent
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'GET temp_landing', 'Got temporary landing content')
    t.equal(calls, 2)
    t.ok(this.agent === agent, 'Reinstantiated the user-specified agent')
    t.ok(this.agentOptions === agentOptions, 'Reused agent options')
    t.end()
  })
})

tape('cleanup', (t) => {
  s.destroy(() => {
    ss.destroy(() => {
      t.end()
    })
  })
})
