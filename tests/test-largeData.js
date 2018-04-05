'use strict'

var server = require('./server')
var request = require('../index')
var tape = require('tape')

var s = server.createServer()

function checkErrCode (t, err) {
  t.notEqual(err, null)
  t.ok(err.code === 'NODE_RESPONSE_SIZE_LIMIT_REACHED')
}

function writeLargeResponseInChunks (resSizeInMb1, req, res) {
  var resSizeInMb = 256

  let str1mb = 'a'
  // generate 1mb string
  for (let j = 0; j < 20; j++) {
    str1mb += str1mb
  }

  let i = 0
  res.writeHead(200, {'content-type': 'text/plain'})
  function partialWrite () {
    if (i < resSizeInMb) {
      res.write(str1mb)
      i++
      // process.stdout.write('Wrote ' + i + 'mb\r')
      setImmediate(partialWrite)
    } else {
      res.end()
    }
  }
  partialWrite()
}

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

tape('should send error in callback for response >=256mb', function (t) {
  s.on('/256mbdata', function (req, res) {
    writeLargeResponseInChunks(256, req, res)
  })

  var options = {
    url: s.url + '/256mbdata'
  }

  request(options, function (err, res, body) {
    checkErrCode(t, err)
    t.end()
  })
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
