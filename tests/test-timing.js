'use strict'

const server = require('./server')
const request = require('../index')
const tape = require('tape')
const http = require('http')

const plainServer = server.createServer()
const redirectMockTime = 10

tape('setup', t => {
  plainServer.listen(0, () => {
    plainServer.on('/', (req, res) => {
      res.writeHead(200)
      res.end('plain')
    })
    plainServer.on('/redir', (req, res) => {
      // fake redirect delay to ensure strong signal for rollup check
      setTimeout(() => {
        res.writeHead(301, {
          location: 'http://localhost:' + plainServer.port + '/'
        })
        res.end()
      }, redirectMockTime)
    })

    t.end()
  })
})

tape('non-redirected request is timed', t => {
  const options = { time: true }

  const start = new Date().getTime()
  const r = request(
    'http://localhost:' + plainServer.port + '/',
    options,
    (err, res, body) => {
      const end = new Date().getTime()

      t.equal(err, null)
      t.equal(typeof res.elapsedTime, 'number')
      t.equal(typeof res.responseStartTime, 'number')
      t.equal(typeof res.timingStart, 'number')
      t.equal(res.timingStart >= start, true)
      t.equal(typeof res.timings, 'object')
      t.equal(res.elapsedTime > 0, true)
      t.equal(res.elapsedTime <= end - start, true)
      t.equal(res.responseStartTime > r.startTime, true)
      t.equal(res.timings.socket >= 0, true)
      t.equal(res.timings.lookup >= res.timings.socket, true)
      t.equal(res.timings.connect >= res.timings.lookup, true)
      t.equal(res.timings.response >= res.timings.connect, true)
      t.equal(res.timings.end >= res.timings.response, true)
      t.equal(typeof res.timingPhases, 'object')
      t.equal(res.timingPhases.wait >= 0, true)
      t.equal(res.timingPhases.dns >= 0, true)
      t.equal(res.timingPhases.tcp >= 0, true)
      t.equal(res.timingPhases.firstByte > 0, true)
      t.equal(res.timingPhases.download > 0, true)
      t.equal(res.timingPhases.total > 0, true)
      t.equal(res.timingPhases.total <= end - start, true)

      // validate there are no unexpected properties
      let propNames = []
      for (const propName in res.timings) {
        if (Object.prototype.hasOwnProperty.call(res.timings, propName)) {
          propNames.push(propName)
        }
      }
      t.deepEqual(propNames, [
        'socket',
        'lookup',
        'connect',
        'response',
        'end'
      ])

      propNames = []
      for (const propName in res.timingPhases) {
        if (Object.prototype.hasOwnProperty.call(res.timingPhases, propName)) {
          propNames.push(propName)
        }
      }
      t.deepEqual(propNames, [
        'wait',
        'dns',
        'tcp',
        'firstByte',
        'download',
        'total'
      ])

      t.end()
    }
  )
})

tape('redirected request is timed with rollup', t => {
  const options = { time: true }
  const r = request(
    'http://localhost:' + plainServer.port + '/redir',
    options,
    (err, res, body) => {
      t.equal(err, null)
      t.equal(typeof res.elapsedTime, 'number')
      t.equal(typeof res.responseStartTime, 'number')
      t.equal(res.elapsedTime > 0, true)
      t.equal(res.responseStartTime > 0, true)
      t.equal(res.elapsedTime > redirectMockTime, true)
      t.equal(res.responseStartTime > r.startTime, true)
      t.end()
    }
  )
})

tape('keepAlive is timed', t => {
  const agent = new http.Agent({ keepAlive: true })
  const options = { time: true, agent: agent }
  const start1 = new Date().getTime()

  request(
    'http://localhost:' + plainServer.port + '/',
    options,
    (err1, res1, body1) => {
      const end1 = new Date().getTime()

      // ensure the first request's timestamps look ok
      t.equal(res1.timingStart >= start1, true)
      t.equal(start1 <= end1, true)

      t.equal(res1.timings.socket >= 0, true)
      t.equal(res1.timings.lookup >= res1.timings.socket, true)
      t.equal(res1.timings.connect >= res1.timings.lookup, true)
      t.equal(res1.timings.response >= res1.timings.connect, true)

      // open a second request with the same agent so we re-use the same connection
      const start2 = new Date().getTime()
      request(
        'http://localhost:' + plainServer.port + '/',
        options,
        (err2, res2, body2) => {
          const end2 = new Date().getTime()

          // ensure the second request's timestamps look ok
          t.equal(res2.timingStart >= start2, true)
          t.equal(start2 <= end2, true)

          // ensure socket==lookup==connect for the second request
          t.equal(res2.timings.socket >= 0, true)
          t.equal(res2.timings.lookup === res2.timings.socket, true)
          t.equal(res2.timings.connect === res2.timings.lookup, true)
          t.equal(res2.timings.response >= res2.timings.connect, true)

          // explicitly shut down the agent
          if (typeof agent.destroy === 'function') {
            agent.destroy()
          } else {
            // node < 0.12
            Object.keys(agent.sockets).forEach(name => {
              agent.sockets[name].forEach(socket => {
                socket.end()
              })
            })
          }

          t.end()
        }
      )
    }
  )
})

tape('cleanup', t => {
  plainServer.close(() => {
    t.end()
  })
})
