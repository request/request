'use strict'
var request = require('../index')
var tape = require('tape')

tape('bind to invalid address', function (t) {
  request.get({
    uri: 'http://www.google.com',
    localAddress: '1.2.3.4'
  }, function (err, res) {
    t.notEqual(err, null)
    t.equal(true, /bind EADDRNOTAVAIL/.test(err.message))
    t.equal(res, undefined)
    t.end()
  })
})

tape('bind to local address', function (t) {
  request.get({
    uri: 'http://www.google.com',
    localAddress: '127.0.0.1'
  }, function (err, res) {
    t.notEqual(err, null)
    t.equal(res, undefined)
    t.end()
  })
})

tape('bind to local address on redirect', function (t) {
  var os = require('os')
  var localInterfaces = os.networkInterfaces()
  var localIPS = []
  Object.keys(localInterfaces).forEach(function (ifname) {
    localInterfaces[ifname].forEach(function (iface) {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return
      }
      localIPS.push(iface.address)
    })
  })
  request.get({
    uri: 'http://google.com', // redirects to 'http://google.com'
    localAddress: localIPS[0]
  }, function (err, res) {
    t.equal(err, null)
    t.equal(res.request.localAddress, localIPS[0])
    t.end()
  })
})
