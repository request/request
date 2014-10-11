var optional = require('../lib/optional')
  , copy = optional('../lib/copy')
  , tape = require('tape')

tape('optional modules show as being loaded by the module that requested them', function(t) {
  t.equal(module.children[1].exports, copy)
  t.equal(module, module.children[1].parent)
  t.end()
})
