var server = require('./server')
  , assert = require('assert')
  , request = require('../main.js')
  , Cookie = require('../vendor/cookie')
  , Jar = require('../vendor/cookie/jar')

var s = server.createServer()
var otherHostServer = server.createServer(6768)


s.listen(s.port, function () {
  var server = 'http://localhost:' + s.port;
  var hits = {}
  var passed = 0;

  bouncer(301, 'temp')
  bouncer(301, 'auth')
  bouncer(302, 'perm')
  bouncer(302, 'nope')

  function bouncer(code, label) {
    var landing = label+'_landing';

    s.on('/'+label, function (req, res) {
      hits[label] = true;
      res.writeHead(code, {
        'location':server + '/'+landing,
        'set-cookie': 'ham=eggs'
      })
      res.end()
    })

    s.on('/'+landing, function (req, res) {
      if (req.method !== 'GET') { // We should only accept GET redirects
        console.error("Got a non-GET request to the redirect destination URL");
        res.writeHead(400);
        res.end();
        return;
      }

      // Enusre that if we're hitting the auth_landing endpoint that we've
      // kept our auth header (same host case)
      if (landing === 'auth_landing'){
        assert.notEqual(req.headers.authorization, undefined)
      }

      // Make sure the cookie doesn't get included twice, see #139:
      // Make sure cookies are set properly after redirect
      assert.equal(req.headers.cookie, 'foo=bar; quux=baz; ham=eggs');
      hits[landing] = true;
      res.writeHead(200)
      res.end(landing)
    })
  }

  // Permanent bounce
  var jar = new Jar()
  jar.add(new Cookie('quux=baz'))
  request({uri: server+'/perm', jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.perm, 'Original request is to /perm')
    assert.ok(hits.perm_landing, 'Forward to permanent landing URL')
    assert.equal(body, 'perm_landing', 'Got permanent landing content')
    passed += 1
    done()
  })
  
  // Temporary bounce
  request({uri: server+'/temp', jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(hits.temp_landing, 'Forward to temporary landing URL')
    assert.equal(body, 'temp_landing', 'Got temporary landing content')
    passed += 1
    done()
  })
  
  // Prevent bouncing.
  request({uri:server+'/nope', jar: jar, headers: {cookie: 'foo=bar'}, followRedirect:false}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 302) throw new Error('Status is not 302: '+res.statusCode)
    assert.ok(hits.nope, 'Original request to /nope')
    assert.ok(!hits.nope_landing, 'No chasing the redirect')
    assert.equal(res.statusCode, 302, 'Response is the bounce itself')
    passed += 1
    done()
  })
  
  // Should not follow post redirects by default
  request.post(server+'/temp', { jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 301) throw new Error('Status is not 301: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(!hits.temp_landing, 'No chasing the redirect when post')
    assert.equal(res.statusCode, 301, 'Response is the bounce itself')
    passed += 1
    done()
  })
  
  // Should follow post redirects when followAllRedirects true
  request.post({uri:server+'/temp', followAllRedirects:true, jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(hits.temp_landing, 'Forward to temporary landing URL')
    assert.equal(body, 'temp_landing', 'Got temporary landing content')
    passed += 1
    done()
  })
  
  request.post({uri:server+'/temp', followAllRedirects:false, jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 301) throw new Error('Status is not 301: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(!hits.temp_landing, 'No chasing the redirect')
    assert.equal(res.statusCode, 301, 'Response is the bounce itself')
    passed += 1
    done()
  })

  // Should not follow delete redirects by default
  request.del(server+'/temp', { jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode < 301) throw new Error('Status is not a redirect.')
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(!hits.temp_landing, 'No chasing the redirect when delete')
    assert.equal(res.statusCode, 301, 'Response is the bounce itself')
    passed += 1
    done()
  })
  
  // Should not follow delete redirects even if followRedirect is set to true
  request.del(server+'/temp', { followRedirect: true, jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 301) throw new Error('Status is not 301: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(!hits.temp_landing, 'No chasing the redirect when delete')
    assert.equal(res.statusCode, 301, 'Response is the bounce itself')
    passed += 1
    done()
  })
  
  // Should follow delete redirects when followAllRedirects true
  request.del(server+'/temp', {followAllRedirects:true, jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(hits.temp_landing, 'Forward to temporary landing URL')
    assert.equal(body, 'temp_landing', 'Got temporary landing content')
    passed += 1
    done()
  })


  // Test for issue #160, Strip auth headers during redirect to different domain
  otherHostServer.listen(otherHostServer.port, function(){
    var landing = 'auth_test_landing';
    var otherURL = 'http://localhost:' + otherHostServer.port;
    otherHostServer.on('/', function (req, res) {
      hits['authTest'] = true;
      res.writeHead(301, {
        'location':server + '/' + landing,
        'set-cookie': 'ham=eggs'
      })
      res.end()
    })

    s.on('/' + landing, function (req, res) {
      if (req.method !== 'GET') { // We should only accept GET redirects
        console.error("Got a non-GET request to the redirect destination URL");
        res.writeHead(400);
        res.end();
        return;
      }

      // Make sure the cookie doesn't get included twice, see #139:
      // Make sure cookies are set properly after redirect
      assert.equal(req.headers.cookie, 'foo=bar; quux=baz; ham=eggs');
      // Make sure we're not forwarding headers outside the realm (#160)
      assert.equal(req.headers.authorization, undefined);
      hits[landing] = true;
      res.writeHead(200)
      res.end(landing)
    })

    // Different host, make sure that the auth header is gone
    request({uri: otherURL, jar: jar, headers: {authorization: "Basic abcdef=", cookie: 'foo=bar'}}, function (er, res, body) {
      if (er) throw er
      if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
      assert.ok(hits.authTest, 'Original request is to /temp')
      assert.ok(hits.auth_test_landing, 'Forward to temporary landing URL')
      assert.equal(body, 'auth_test_landing', 'Got temporary landing content')
      passed += 1
      done()
    })

    // Same server, ensure that auth header is present
    request({uri: server+'/auth', jar: jar, headers: {authorization: "Basic abcdef=", cookie: 'foo=bar'}}, function (er, res, body) {
      if (er) throw er
      if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
      assert.ok(hits.auth, 'Original request is to /auth`')
      assert.ok(hits.auth_landing, 'Forward to auth landing URL')
      assert.equal(body, 'auth_landing', 'Got auth landing content')
      passed += 1
      done()
    })
  })


  var reqs_done = 0;
  function done() {
    reqs_done += 1;
    if(reqs_done == 10) {
      console.log(passed + ' tests passed.')
      s.close()
      otherHostServer.close()
    }
  }
})
