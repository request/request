'use strict'

function checkErrCode (t, err) {
  t.notEqual(err, null)
  t.ok(err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT',
    'Error ETIMEDOUT or ESOCKETTIMEDOUT')
}

function checkEventHandlers (t, socket) {
  var connectListeners = socket.listeners('connect')
  var found = false
  for (var i = 0; i < connectListeners.length; ++i) {
    var fn = connectListeners[i]
    if (typeof fn === 'function' && fn.name === 'onReqSockConnect') {
      found = true
      break
    }
  }
  t.ok(!found, 'Connect listener should not exist')
}

var server = require('./server')
var request = require('../index')
var tape = require('tape')

var s = server.createServer()

// Request that waits for 200ms
s.on('/timeout', function (req, res) {
  setTimeout(function () {
    res.writeHead(200, {'content-type': 'text/plain'})
    res.write('waited')
    res.end()
  }, 200)
})

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

tape('should timeout', function (t) {
  var shouldTimeout = {
    url: s.url + '/timeout',
    timeout: 100
  }

  request(shouldTimeout, function (err, res, body) {
    checkErrCode(t, err)
    t.end()
  })
})

tape('should set connect to false', function (t) {
  var shouldTimeout = {
    url: s.url + '/timeout',
    timeout: 100
  }

  request(shouldTimeout, function (err, res, body) {
    checkErrCode(t, err)
    t.ok(err.connect === false, 'Read Timeout Error should set \'connect\' property to false')
    t.end()
  })
})

tape('should timeout with events', function (t) {
  t.plan(3)

  var shouldTimeoutWithEvents = {
    url: s.url + '/timeout',
    timeout: 100
  }

  var eventsEmitted = 0
  request(shouldTimeoutWithEvents)
    .on('error', function (err) {
      eventsEmitted++
      t.equal(1, eventsEmitted)
      checkErrCode(t, err)
    })
})

tape('should not timeout', function (t) {
  var shouldntTimeout = {
    url: s.url + '/timeout',
    timeout: 1200
  }

  var socket
  request(shouldntTimeout, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'waited')
    checkEventHandlers(t, socket)
    t.end()
  }).on('socket', function (socket_) {
    socket = socket_
  })
})

tape('no timeout', function (t) {
  var noTimeout = {
    url: s.url + '/timeout'
  }

  request(noTimeout, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, 'waited')
    t.end()
  })
})

tape('negative timeout', function (t) { // should be treated a zero or the minimum delay
  var negativeTimeout = {
    url: s.url + '/timeout',
    timeout: -1000
  }

  request(negativeTimeout, function (err, res, body) {
    // Only verify error if it is set, since using a timeout value of 0 can lead
    // to inconsistent results, depending on a variety of factors
    if (err) {
      checkErrCode(t, err)
    }
    t.end()
  })
})

tape('float timeout', function (t) { // should be rounded by setTimeout anyway
  var floatTimeout = {
    url: s.url + '/timeout',
    timeout: 100.76
  }

  request(floatTimeout, function (err, res, body) {
    checkErrCode(t, err)
    t.end()
  })
})

// We need a destination that will not immediately return a TCP Reset
// packet. StackOverflow suggests these hosts:
// (https://stackoverflow.com/a/904609/329700)
var nonRoutable = [
  '10.255.255.1',
  '10.0.0.0',
  '192.168.0.0',
  '192.168.255.255',
  '172.16.0.0',
  '172.31.255.255'
]
var nrIndex = 0
function getNonRoutable () {
  var ip = nonRoutable[nrIndex]
  if (!ip) {
    throw new Error('No more non-routable addresses')
  }
  ++nrIndex
  return ip
}
tape('connect timeout', function tryConnect (t) {
  var tarpitHost = 'http://' + getNonRoutable()
  var shouldConnectTimeout = {
    url: tarpitHost + '/timeout',
    timeout: 100
  }
  var socket
  request(shouldConnectTimeout, function (err) {
    t.notEqual(err, null)
    if (err.code === 'ENETUNREACH' && nrIndex < nonRoutable.length) {
      // With some network configurations, some addresses will be reported as
      // unreachable immediately (before the timeout occurs). In those cases,
      // try other non-routable addresses before giving up.
      return tryConnect(t)
    }
    checkErrCode(t, err)
    t.ok(err.connect === true, 'Connect Timeout Error should set \'connect\' property to true')
    checkEventHandlers(t, socket)
    nrIndex = 0
    t.end()
  }).on('socket', function (socket_) {
    socket = socket_
  })
})

tape('connect timeout with non-timeout error', function tryConnect (t) {
  var tarpitHost = 'http://' + getNonRoutable()
  var shouldConnectTimeout = {
    url: tarpitHost + '/timeout',
    timeout: 1000
  }
  var socket
  request(shouldConnectTimeout, function (err) {
    t.notEqual(err, null)
    if (err.code === 'ENETUNREACH' && nrIndex < nonRoutable.length) {
      // With some network configurations, some addresses will be reported as
      // unreachable immediately (before the timeout occurs). In those cases,
      // try other non-routable addresses before giving up.
      return tryConnect(t)
    }
    // Delay the check since the 'connect' handler is removed in a separate
    // 'error' handler which gets triggered after this callback
    setImmediate(function () {
      checkEventHandlers(t, socket)
      nrIndex = 0
      t.end()
    })
  }).on('socket', function (socket_) {
    socket = socket_
    setImmediate(function () {
      socket.emit('error', new Error('Fake Error'))
    })
  })
})

tape('request timeout with keep-alive connection', function (t) {
  var Agent = require('http').Agent
  var agent = new Agent({ keepAlive: true })
  var firstReq = {
    url: s.url + '/timeout',
    agent: agent
  }
  request(firstReq, function (err) {
    // We should now still have a socket open. For the second request we should
    // see a request timeout on the active socket ...
    t.equal(err, null)
    var shouldReqTimeout = {
      url: s.url + '/timeout',
      timeout: 100,
      agent: agent
    }
    request(shouldReqTimeout, function (err) {
      checkErrCode(t, err)
      t.ok(err.connect === false, 'Error should have been a request timeout error')
      t.end()
    }).on('socket', function (socket) {
      var isConnecting = socket._connecting || socket.connecting
      t.ok(isConnecting !== true, 'Socket should already be connected')
    })
  }).on('socket', function (socket) {
    var isConnecting = socket._connecting || socket.connecting
    t.ok(isConnecting === true, 'Socket should be new')
  })
})

tape('calling abort clears the timeout', function (t) {
  const req = request({ url: s.url + '/timeout', timeout: 2500 })
  setTimeout(function () {
    req.abort()
    t.equal(req.timeoutTimer, null)
    t.end()
  }, 5)
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
