try {
  require('tough-cookie')
} catch (e) {
  console.error('tough-cookie must be installed to run this test.')
  console.error('skipping this test. please install tough-cookie and run again if you need to test this feature.')
  process.exit(0)
}

var server = require('./server')
  , assert = require('assert')
  , request = require('../index')
  ;

var s = server.createServer()
  , ss = server.createSSLServer()
  ;

s.listen(s.port, function () {
  ss.listen(ss.port, function() {
    serversReady()
  })
})

function serversReady() {
  var server = 'http://localhost:' + s.port;
  var sserver = 'https://localhost:' + ss.port;
  var hits = {}
  var passed = 0;

  bouncer(301, 'temp')
  bouncer(301, 'double', 2)
  bouncer(302, 'perm')
  bouncer(302, 'nope')
  bouncer(307, 'fwd')

  s.on('/ssl', function(req, res) {
    res.writeHead(302, {
      'location' : sserver + '/'
    })
    res.end()
  })

  ss.on('/', function(req, res) {
    res.writeHead(200)
    res.end('SSL')
  })

  function bouncer(code, label, hops) {
    var hop,
        landing = label+'_landing',
        currentLabel,
        currentLanding;

    hops = hops || 1;

    if (hops === 1) {
      createRedirectEndpoint(code, label, landing);
    } else {
      for (hop=0; hop<hops; hop++) {
        currentLabel = (hop===0) ? label : label + '_' + (hop+1);
        currentLanding = (hop===hops - 1) ? landing : label + '_' + (hop+2);

        createRedirectEndpoint(code, currentLabel, currentLanding);
      }
    }

    createLandingEndpoint(landing);
  }

  function createRedirectEndpoint(code, label, landing) {
    s.on('/'+label, function (req, res) {
      hits[label] = true;
      res.writeHead(code, {
        'location':server + '/'+landing,
        'set-cookie': 'ham=eggs'
      })
      res.end()
    })
  }

  function createLandingEndpoint(landing) {
    s.on('/'+landing, function (req, res) {
      // Make sure the cookie doesn't get included twice, see #139:
      // Make sure cookies are set properly after redirect
      assert.equal(req.headers.cookie, 'foo=bar; quux=baz; ham=eggs');
      hits[landing] = true;
      res.writeHead(200)
      res.end(req.method.toUpperCase() + ' ' + landing)
    })
  }

  // Permanent bounce
  var jar = request.jar()
  jar.setCookie('quux=baz', server);
  request({uri: server+'/perm', jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.perm, 'Original request is to /perm')
    assert.ok(hits.perm_landing, 'Forward to permanent landing URL')
    assert.equal(body, 'GET perm_landing', 'Got permanent landing content')
    passed += 1
    done()
  })
  
  // Temporary bounce
  request({uri: server+'/temp', jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.temp, 'Original request is to /temp')
    assert.ok(hits.temp_landing, 'Forward to temporary landing URL')
    assert.equal(body, 'GET temp_landing', 'Got temporary landing content')
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
    assert.equal(body, 'GET temp_landing', 'Got temporary landing content')
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
    assert.equal(body, 'GET temp_landing', 'Got temporary landing content')
    passed += 1
    done()
  })  
    
  request.del(server+'/fwd', {followAllRedirects:true, jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.fwd, 'Original request is to /fwd')
    assert.ok(hits.fwd_landing, 'Forward to temporary landing URL')
    assert.equal(body, 'DELETE fwd_landing', 'Got temporary landing content')
    passed += 1
    done()
  })

  // Double bounce
  request({uri: server+'/double', jar: jar, headers: {cookie: 'foo=bar'}}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) throw new Error('Status is not 200: '+res.statusCode)
    assert.ok(hits.double, 'Original request is to /double')
    assert.ok(hits.double_2, 'Forward to temporary landing URL')
    assert.ok(hits.double_landing, 'Forward to landing URL')
    assert.equal(body, 'GET double_landing', 'Got temporary landing content')
    passed += 1
    done()
  })

  function filter(response) {
    var location = response.headers.location || '';

    if (~location.indexOf('double_2')) {
      return false;
    }

    return true;
  }

  // Double bounce terminated after first redirect
  request({uri: server+'/double', jar: jar, headers: {cookie: 'foo=bar'}, followRedirect: filter}, function (er, res, body) {
    if (er) throw er
    if (res.statusCode !== 301) { console.log('B:'+body);  throw new Error('Status is not 301: '+res.statusCode)}
    assert.ok(hits.double, 'Original request is to /double')
    assert.equal(res.headers.location, server+'/double_2', 'Current location should be ' + server+'/double_2')
    passed += 1
    done()
  })

  // HTTP to HTTPS redirect
  request.get({uri: require('url').parse(server+'/ssl'), rejectUnauthorized: false}, function(er, res, body) {
    if (er) throw er
    if (res.statusCode !== 200) {
      console.log('Body: ' + body);
      throw new Error('Status is not 200: ' + res.statusCode);
    }
    assert.equal(body, 'SSL', 'Got SSL redirect')
    passed += 1
    done()
  })

  var reqs_done = 0;
  function done() {
    reqs_done += 1;
    if(reqs_done == 13) {
      console.log(passed + ' tests passed.')
      s.close()
      ss.close()
    }
  }
}
