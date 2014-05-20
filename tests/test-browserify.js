var browserify = require('browserify'),
  assert = require('assert'),
  b = browserify();

b.add('..');
b.bundle({}, assert.ifError)
