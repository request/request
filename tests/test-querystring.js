var request = request = require('../index')
  , assert = require('assert')
  ;


// Test adding a querystring
var req1 = request.get({ uri: 'http://www.google.com', useQuerystring: true, qs: { q : 'search' }})
setTimeout(function() {
  assert.equal('/?q=search', req1.path)
}, 1)

// Test replacing a querystring value
var req2 = request.get({ uri: 'http://www.google.com?q=abc', useQuerystring: true, qs: { q : 'search' }})
setTimeout(function() {
  assert.equal('/?q=search', req2.path)
}, 1)

// Test appending a querystring value to the ones present in the uri
var req3 = request.get({ uri: 'http://www.google.com?x=y', useQuerystring: true, qs: { q : 'search' }})
setTimeout(function() {
  assert.equal('/?x=y&q=search', req3.path)
}, 1)

// Test leaving a querystring alone
var req4 = request.get({ uri: 'http://www.google.com?x=y', useQuerystring: true})
setTimeout(function() {
  assert.equal('/?x=y', req4.path)
}, 1)

// Test giving empty qs property
var req5 = request.get({ uri: 'http://www.google.com', qs: {}, useQuerystring: true})
setTimeout(function(){
  assert.equal('/', req5.path)
}, 1)


// Test modifying the qs after creating the request
var req6 = request.get({ uri: 'http://www.google.com', qs: {}, useQuerystring: true})
req6.qs({ q: "test" });
process.nextTick(function() {
  assert.equal('/?q=test', req6.path);
});

// Test using array param
var req7 = request.get({ uri: 'http://www.google.com', qs: {foo: ['bar', 'baz']}, useQuerystring: true})
process.nextTick(function() {
  assert.equal('/?foo=bar&foo=baz', req7.path);
});

// Test using array param
var req7 = request.get({ uri: 'http://www.google.com', qs: {foo: ['bar', 'baz']}, useQuerystring: true})
process.nextTick(function() {
  assert.equal('/?foo=bar&foo=baz', req7.path);
});
