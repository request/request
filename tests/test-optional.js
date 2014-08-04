var assert = require('assert')
  , optional = require('../lib/optional')
  , copy = optional('../lib/copy');

assert.equal(module,module.children[1].parent);
