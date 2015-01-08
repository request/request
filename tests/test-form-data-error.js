'use strict'

var request = require('../index')
  , tape = require('tape')

function runTest(t) {
  var req
    , form
    , reqOptions = {
      url: 'http://localhost:8080/'
    }

    req = request.post(reqOptions, function (err, res, body) {
      t.equal(err.message,'Arrays are not supported.')
      t.end()
    })

    form = req.form()
    form.append('field',['value1','value2'])
}


tape('re-emit formData errors', function(t) {
  runTest(t)
})
