var server = require('./server')
  , assert = require('assert')
  , request = require('../main.js')
  , Cookie = require('../vendor/cookie')
  , Jar = require('../vendor/cookie/jar')

var s = server.createServer()


s.listen(s.port, function () {
  var server = 'http://localhost:' + s.port;
  var hits = {}
  var passed = 0;

  bouncer(301, 'temp')
  bouncer(301, 'auth_same')
  bouncer(301, 'auth_diff')
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

      // #160 Enusre that if we're hitting the auth_same_landing endpoint that we've
      // kept our auth header (same host case)
      if (landing === 'auth_same_landing'){
        assert.notEqual(req.headers.authorization, undefined)
      // #160 Enusre that if we're hitting the auth_diff_landing endpoint that we've
      // deleted any auth header (diff host case)
      } else if (landing === 'auth_diff_landing') {
        assert.equal(req.headers.authorization, undefined)
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
  request({uri: 'http://127.0.0.1:' + s.port + "/auth_diff", jar: jar, headers: {authorization: "Basic abcdef=", cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.auth_diff, 'Original request is to /auth_diff')
    assert.ok(hits.auth_diff_landing, 'Forward to diff auth landing URL')
    assert.equal(body, 'auth_diff_landing', 'Got diff auth landing content')
    passed += 1
    done()
  })

  // Test for issue #160, keep auth headers during redirect to different domain
  request({uri: server+'/auth_same', jar: jar, headers: {authorization: "Basic abcdef=", cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.auth_same, 'Original request is to /auth_same')
    assert.ok(hits.auth_same_landing, 'Forward to same auth landing URL')
    assert.equal(body, 'auth_same_landing', 'Got same auth landing content')
    passed += 1
    done()
  })

  var reqs_done = 0;
  function done() {
    reqs_done += 1;
    if(reqs_done == 10) {
      console.log(passed + ' tests passed.')
      s.close()
    }
  }
})
