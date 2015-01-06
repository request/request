'use strict'

// test that we can tunnel a https request over an http proxy
// keeping all the CA and whatnot intact.
//
// Note: this requires that squid is installed.
// If the proxy fails to start, we'll just log a warning and assume success.

var server = require('./server')
  , request = require('../index')
  , fs = require('fs')
  , path = require('path')
  , child_process = require('child_process')
  , tape = require('tape')

var sqConf = path.resolve(__dirname, 'squid.conf')
  , sqArgs = ['-f', sqConf, '-N', '-d', '5']
  , proxy = 'http://localhost:3128'
  , squid
  , ready = false
  , installed = true
  , squidError = null

// This test doesn't fit into tape very well...

tape('setup', function(t) {
  squid = child_process.spawn('squid', sqArgs)

  squid.stderr.on('data', function(c) {
    console.error('SQUIDERR ' + c.toString().trim().split('\n').join('\nSQUIDERR '))
    ready = c.toString().match(/ready to serve requests|Accepting HTTP Socket connections/i)
  })

  squid.stdout.on('data', function(c) {
    console.error('SQUIDOUT ' + c.toString().trim().split('\n').join('\nSQUIDOUT '))
  })

  squid.on('error', function(c) {
    console.error('squid: error ' + c)
    if (c && !ready) {
      installed = false
    }
  })

  squid.on('exit', function(c) {
    console.error('squid: exit ' + c)
    if (c && !ready) {
      installed = false
      return
    }

    if (c) {
      squidError = squidError || new Error('Squid exited with code ' + c)
    }
    if (squidError) {
      throw squidError
    }
  })

  t.end()
})

tape('tunnel', function(t) {
  setTimeout(function F() {
    if (!installed) {
      console.error('squid must be installed to run this test.')
      console.error('skipping this test. please install squid and run again if you need to test tunneling.')
      t.skip()
      t.end()
      return
    }
    if (!ready) {
      setTimeout(F, 100)
      return
    }
    request({
      uri: 'https://registry.npmjs.org/',
      proxy: 'http://localhost:3128',
      strictSSL: true,
      json: true
    }, function(err, body) {
      t.equal(err, null)
      t.end()
    })
  }, 100)
})

tape('cleanup', function(t) {
  squid.kill('SIGKILL')
  t.end()
})
