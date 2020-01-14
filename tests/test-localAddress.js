'use strict'
const request = require('../index')
const tape = require('tape')

tape('bind to invalid address', t => {
  request.get(
    {
      uri: 'http://www.google.com',
      localAddress: '1.2.3.4'
    },
    (err, res) => {
      t.notEqual(err, null)
      t.equal(true, /bind EADDRNOTAVAIL/.test(err.message))
      t.equal(res, undefined)
      t.end()
    }
  )
})

tape('bind to local address', t => {
  request.get(
    {
      uri: 'http://www.google.com',
      localAddress: '127.0.0.1'
    },
    (err, res) => {
      t.notEqual(err, null)
      t.equal(res, undefined)
      t.end()
    }
  )
})

tape('bind to local address on redirect', t => {
  const os = require('os')
  const localInterfaces = os.networkInterfaces()
  const localIPS = []
  Object.keys(localInterfaces).forEach(ifname => {
    localInterfaces[ifname].forEach(iface => {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return
      }
      localIPS.push(iface.address)
    })
  })
  request.get(
    {
      uri: 'http://google.com', // redirects to 'http://google.com'
      localAddress: localIPS[0]
    },
    (err, res) => {
      t.equal(err, null)
      t.equal(res.request.localAddress, localIPS[0])
      t.end()
    }
  )
})
