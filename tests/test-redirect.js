var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();
var remainingTests = 6;
var notRedirected = 'Not redirected';
var redirectSuccessful = 'Redirect succeeded.';

// Request that redirects
s.on('/redirect', function (req, resp) {
  resp.writeHead(301, {'content-type':'text/plain',
                       'location':s.url + '/other_url'})
  resp.write(notRedirected)
  resp.end()
});

s.on('/other_url', function (req, resp) {
  if (req.method !== 'GET') { // We should only accept GET redirects
    console.error("Got a non-GET request to the redirect destination URL");
    resp.writeHead(400);
    resp.end();
    return;
  }
  resp.writeHead(200, {'content-type':'text/plain' });
  resp.write(redirectSuccessful)
  resp.end()
});

// Should follow redirects by default
var options = { url: s.url + "/redirect", method: 'GET' };
request(options, function (err, resp, body) {
  assert.equal(body, redirectSuccessful);
  checkDone();
})

// Shouldn't redirect when followRedirect is false
options = { url: s.url + "/redirect", method: 'GET', followRedirect: false };
request(options, function (err, resp, body) {
  assert.equal(body, notRedirected);
  checkDone();
})

// Should redirect when followRedirect is true
options = { url: s.url + "/redirect", method: 'GET', followRedirect: true };
request(options, function (err, resp, body) {
  assert.equal(body, redirectSuccessful);
  checkDone();
})

// Should not follow post redirects by default
options = { url: s.url + "/redirect", followRedirect: true };
request.post(options, function (err, resp, body) {
  assert.equal(body, notRedirected);
  checkDone();
})

// Should follow post redirects when followAllRedirects true
options = { url: s.url + "/redirect", followAllRedirects: true };
request.post(options, function (err, resp, body) {
  assert.equal(body, redirectSuccessful);
  checkDone();
})

// Should not follow post redirects when followAllRedirects false
options = { url: s.url + "/redirect", followAllRedirects: false };
request.post(options, function (err, resp, body) {
  assert.equal(body, notRedirected);
  checkDone();
})

function checkDone() {
  if(--remainingTests == 0) {
    s.close();
    console.log("All tests passed.");
  }
}
