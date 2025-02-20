'use strict';

var server = require('./server');
var assert = require('assert');
var request = require('../index');
var tape = require('tape');
var http = require('http');
var destroyable = require('server-destroy');

var s = server.createServer();
var ss = server.createSSLServer();
var hits = {};
var jar = request.jar();

var allowCrossProtocolRedirects = true; // New configuration option

destroyable(s);
destroyable(ss);

s.on('/ssl', function (req, res) {
  res.writeHead(302, {
    location: ss.url + '/'
  });
  res.end();
});

ss.on('/', function (req, res) {
  res.writeHead(200);
  res.end('SSL');
});

function createRedirectEndpoint(code, label, landing) {
  s.on('/' + label, function (req, res) {
    hits[label] = true;
    res.writeHead(code, {
      'location': s.url + '/' + landing,
      'set-cookie': 'ham=eggs'
    });
    res.end();
  });
}

function createLandingEndpoint(landing) {
  s.on('/' + landing, function (req, res) {
    assert.equal(req.headers.cookie, 'foo=bar; quux=baz; ham=eggs');
    hits[landing] = true;
    res.writeHead(200, {'x-response': req.method.toUpperCase() + ' ' + landing});
    res.end(req.method.toUpperCase() + ' ' + landing);
  });
}

function bouncer(code, label, hops) {
  var hop;
  var landing = label + '_landing';
  var currentLabel;
  var currentLanding;

  hops = hops || 1;

  if (hops === 1) {
    createRedirectEndpoint(code, label, landing);
  } else {
    for (hop = 0; hop < hops; hop++) {
      currentLabel = (hop === 0) ? label : label + '_' + (hop + 1);
      currentLanding = (hop === hops - 1) ? landing : label + '_' + (hop + 2);

      createRedirectEndpoint(code, currentLabel, currentLanding);
    }
  }

  createLandingEndpoint(landing);
}

tape('setup', function (t) {
  s.listen(0, function () {
    ss.listen(0, function () {
      bouncer(301, 'temp');
      bouncer(301, 'double', 2);
      bouncer(301, 'treble', 3);
      bouncer(302, 'perm');
      bouncer(302, 'nope');
      bouncer(307, 'fwd');
      t.end();
    });
  });
});

tape('cross-protocol redirect should be followed when allowed', function (t) {
  hits = {};
  request.get({
    uri: s.url + '/ssl',
    jar: jar,
    followRedirect: allowCrossProtocolRedirects,
    headers: { cookie: 'foo=bar' }
  }, function (err, res, body) {
    t.equal(err, null);
    t.equal(res.statusCode, 200);
    t.ok(hits.ssl, 'Original request is to /ssl');
    t.ok(hits.ssl_landing, 'Redirect followed to SSL landing');
    t.equal(body, 'SSL', 'Received SSL content');
    t.end();
  });
});

tape('permanent bounce', function (t) {
  jar.setCookie('quux=baz', s.url);
  hits = {};
  request({
    uri: s.url + '/perm',
    jar: jar,
    headers: { cookie: 'foo=bar' }
  }, function (err, res, body) {
    t.equal(err, null);
    t.equal(res.statusCode, 200);
    t.ok(hits.perm, 'Original request is to /perm');
    t.ok(hits.perm_landing, 'Forward to permanent landing URL');
    t.equal(body, 'GET perm_landing', 'Got permanent landing content');
    t.end();
  });
});

// Additional test cases...

tape('cleanup', function (t) {
  s.destroy(function () {
    ss.destroy(function () {
      t.end();
    });
  });
});