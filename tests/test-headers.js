try {
  require('tough-cookie')
} catch (e) {
  console.error('tough-cookie must be installed to run this test.')
  console.error('skipping this test. please install tough-cookie and run again if you need to test this feature.')
  process.exit(0)
}

var server = require('./server')
  , request = require('../index')
  , tape = require('tape')

var s = server.createServer()

tape('setup', function(t) {
  s.listen(s.port, function() {
    t.end()
  })
})

function runTest(name, path, requestObj, serverAssertFn) {
  tape(name, function(t) {
    s.on('/' + path, function(req, res) {
      serverAssertFn(t, req, res)
      res.writeHead(200)
      res.end()
    })
    requestObj.url = s.url + '/' + path
    request(requestObj, function(err, res, body) {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.end()
    })
  })
}

runTest(
  '#125: headers.cookie with no cookie jar',
  'no-jar',
  {headers: {cookie: 'foo=bar'}},
  function(t, req, res) {
    t.equal(req.headers.cookie, 'foo=bar')
  })

var jar = request.jar()
jar.setCookie('quux=baz', s.url)
runTest(
  '#125: headers.cookie + cookie jar',
  'header-and-jar',
  {jar: jar, headers: {cookie: 'foo=bar'}},
  function(t, req, res) {
    t.equal(req.headers.cookie, 'foo=bar; quux=baz')
  })

var jar2 = request.jar()
jar2.setCookie('quux=baz; Domain=foo.bar.com', s.url, {ignoreError: true})
runTest(
  '#794: ignore cookie parsing and domain errors',
  'ignore-errors',
  {jar: jar2, headers: {cookie: 'foo=bar'}},
  function(t, req, res) {
    t.equal(req.headers.cookie, 'foo=bar')
  })

runTest(
  '#784: override content-type when json is used',
  'json',
  {
    json: true,
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=UTF-8' },
    body: { hello: 'my friend' }},
  function(t, req, res) {
    t.equal(req.headers['content-type'], 'application/json; charset=UTF-8')
  }
)

runTest(
  'neither headers.cookie nor a cookie jar is specified',
  'no-cookie',
  {},
  function(t, req, res) {
    t.equal(req.headers.cookie, undefined)
  })

tape('cleanup', function(t) {
  s.close()
  t.end()
})
