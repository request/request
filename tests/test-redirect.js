var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();
var remainingTests = 5;
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
  resp.writeHead(200, {'content-type':'text/plain' });
  resp.write(redirectSuccessful)
  resp.end()
});

// Should follow redirects by default
var options = { url: s.url + "/redirect" };
request(options, function (err, resp, body) {
  assert.equal(body, redirectSuccessful);
  checkDone();
})

// Shouldn't redirect when followRedirect is false
options = { url: s.url + "/redirect", followRedirect: false };
request(options, function (err, resp, body) {
  assert.equal(body, notRedirected);
  checkDone();
})

// Should redirect when followRedirect is true
options = { url: s.url + "/redirect", followRedirect: true };
request(options, function (err, resp, body) {
  assert.equal(body, redirectSuccessful);
  checkDone();
})

// Should not follow post redirects when followRedirect true
options = { url: s.url + "/redirect", followRedirect: true };
request.post(options, function (err, resp, body) {
  assert.equal(body, notRedirected);
  checkDone();
})

// Should follow post redirects when followAllRedirects true
options = { url: s.url + "/redirect", followAllRedirects: true };
request(options, function (err, resp, body) {
  assert.equal(body, redirectSuccessful);
  checkDone();
})

function checkDone() {
  if(--remainingTests == 0) {
    s.close();
    console.log("All tests passed.");
  }
}
