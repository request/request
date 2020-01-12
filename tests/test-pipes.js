'use strict'

const server = require('./server')
const stream = require('stream')
const fs = require('fs')
const request = require('../index')
const path = require('path')
const tape = require('tape')

const s = server.createServer()

s.on('/cat', (req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, {
      'content-type': 'text/plain-test',
      'content-length': 4
    })
    res.end('asdf')
  } else if (req.method === 'PUT') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    }).on('end', () => {
      res.writeHead(201)
      res.end()
      s.emit('catDone', req, res, body)
    })
  }
})

s.on('/doodle', (req, res) => {
  if (req.headers['x-oneline-proxy']) {
    res.setHeader('x-oneline-proxy', 'yup')
  }
  res.writeHead('200', { 'content-type': 'image/jpeg' })
  fs.createReadStream(path.join(__dirname, 'googledoodle.jpg')).pipe(res)
})

class ValidationStream extends stream.Stream {
  constructor (t, str) {
    super()
    this.str = str
    this.buf = ''
    this.on('data', (data) => {
      this.buf += data
    })
    this.on('end', () => {
      t.equal(this.str, this.buf)
    })
    this.writable = true
  }

  write (chunk) {
    this.emit('data', chunk)
  }

  end (chunk) {
    if (chunk) {
      this.emit('data', chunk)
    }
    this.emit('end')
  }
}

tape('setup', (t) => {
  s.listen(0, () => {
    t.end()
  })
})

tape('piping to a request object', (t) => {
  s.once('/push', server.createPostValidator('mydata'))

  const mydata = new stream.Stream()
  mydata.readable = true

  const r1 = request.put({
    url: s.url + '/push'
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'mydata')
    t.end()
  })
  mydata.pipe(r1)

  mydata.emit('data', 'mydata')
  mydata.emit('end')
})

tape('piping to a request object with invalid uri', (t) => {
  const mybodydata = new stream.Stream()
  mybodydata.readable = true

  const r2 = request.put({
    url: '/bad-uri',
    json: true
  }, (err, res, body) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Invalid URI "/bad-uri"')
    t.end()
  })
  mybodydata.pipe(r2)

  mybodydata.emit('data', JSON.stringify({ foo: 'bar' }))
  mybodydata.emit('end')
})

tape('piping to a request object with a json body', (t) => {
  const obj = {foo: 'bar'}
  const json = JSON.stringify(obj)
  s.once('/push-json', server.createPostValidator(json, 'application/json'))
  const mybodydata = new stream.Stream()
  mybodydata.readable = true

  const r2 = request.put({
    url: s.url + '/push-json',
    json: true
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.deepEqual(body, obj)
    t.end()
  })
  mybodydata.pipe(r2)

  mybodydata.emit('data', JSON.stringify({ foo: 'bar' }))
  mybodydata.emit('end')
})

tape('piping from a request object', (t) => {
  s.once('/pull', server.createGetResponse('mypulldata'))

  const mypulldata = new stream.Stream()
  mypulldata.writable = true

  request({
    url: s.url + '/pull'
  }).pipe(mypulldata)

  let d = ''

  mypulldata.write = (chunk) => {
    d += chunk
  }
  mypulldata.end = () => {
    t.equal(d, 'mypulldata')
    t.end()
  }
})

tape('pause when piping from a request object', (t) => {
  s.once('/chunks', (req, res) => {
    res.writeHead(200, {
      'content-type': 'text/plain'
    })
    res.write('Chunk 1')
    setTimeout(() => { res.end('Chunk 2') }, 10)
  })

  let chunkNum = 0
  let paused = false
  request({
    url: s.url + '/chunks'
  })
    .on('data', function (chunk) {
      const self = this

      t.notOk(paused, 'Only receive data when not paused')

      ++chunkNum
      if (chunkNum === 1) {
        t.equal(chunk.toString(), 'Chunk 1')
        self.pause()
        paused = true
        setTimeout(() => {
          paused = false
          self.resume()
        }, 100)
      } else {
        t.equal(chunk.toString(), 'Chunk 2')
      }
    })
    .on('end', t.end.bind(t))
})

tape('pause before piping from a request object', (t) => {
  s.once('/pause-before', (req, res) => {
    res.writeHead(200, {
      'content-type': 'text/plain'
    })
    res.end('Data')
  })

  let paused = true
  const r = request({
    url: s.url + '/pause-before'
  })
  r.pause()
  r.on('data', (data) => {
    t.notOk(paused, 'Only receive data when not paused')
    t.equal(data.toString(), 'Data')
  })
  r.on('end', t.end.bind(t))

  setTimeout(() => {
    paused = false
    r.resume()
  }, 100)
})

const fileContents = fs.readFileSync(__filename)
function testPipeFromFile (testName, hasContentLength) {
  tape(testName, (t) => {
    s.once('/pushjs', (req, res) => {
      if (req.method === 'PUT') {
        t.equal(req.headers['content-type'], 'application/javascript')
        t.equal(
          req.headers['content-length'],
          (hasContentLength ? '' + fileContents.length : undefined))
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (data) => {
          body += data
        })
        req.on('end', () => {
          res.end()
          t.equal(body, fileContents.toString())
          t.end()
        })
      } else {
        res.end()
      }
    })
    const r = request.put(s.url + '/pushjs')
    fs.createReadStream(__filename).pipe(r)
    if (hasContentLength) {
      r.setHeader('content-length', fileContents.length)
    }
  })
}

// TODO Piping from a file does not send content-length header
testPipeFromFile('piping from a file', false)
testPipeFromFile('piping from a file with content-length', true)

tape('piping to and from same URL', (t) => {
  s.once('catDone', (req, res, body) => {
    t.equal(req.headers['content-type'], 'text/plain-test')
    t.equal(req.headers['content-length'], '4')
    t.equal(body, 'asdf')
    t.end()
  })
  request.get(s.url + '/cat')
    .pipe(request.put(s.url + '/cat'))
})

tape('piping between urls', (t) => {
  s.once('/catresp', (req, res) => {
    request.get(s.url + '/cat').pipe(res)
  })

  request.get(s.url + '/catresp', (err, res, body) => {
    t.equal(err, null)
    t.equal(res.headers['content-type'], 'text/plain-test')
    t.equal(res.headers['content-length'], '4')
    t.end()
  })
})

tape('writing to file', (t) => {
  const doodleWrite = fs.createWriteStream(path.join(__dirname, 'test.jpg'))

  request.get(s.url + '/doodle').pipe(doodleWrite)

  doodleWrite.on('close', () => {
    t.deepEqual(
      fs.readFileSync(path.join(__dirname, 'googledoodle.jpg')),
      fs.readFileSync(path.join(__dirname, 'test.jpg')))
    fs.unlinkSync(path.join(__dirname, 'test.jpg'))
    t.end()
  })
})

tape('one-line proxy', (t) => {
  s.once('/onelineproxy', (req, res) => {
    const x = request(s.url + '/doodle')
    req.pipe(x)
    x.pipe(res)
  })

  request.get({
    uri: s.url + '/onelineproxy',
    headers: { 'x-oneline-proxy': 'nope' }
  }, (err, res, body) => {
    t.equal(err, null)
    t.equal(res.headers['x-oneline-proxy'], 'yup')
    t.equal(body, fs.readFileSync(path.join(__dirname, 'googledoodle.jpg')).toString())
    t.end()
  })
})

tape('piping after response', (t) => {
  s.once('/afterresponse', (req, res) => {
    res.write('d')
    res.end()
  })

  const rAfterRes = request.post(s.url + '/afterresponse')

  rAfterRes.on('response', () => {
    const v = new ValidationStream(t, 'd')
    rAfterRes.pipe(v)
    v.on('end', () => {
      t.end()
    })
  })
})

tape('piping through a redirect', (t) => {
  s.once('/forward1', (req, res) => {
    res.writeHead(302, { location: '/forward2' })
    res.end()
  })
  s.once('/forward2', (req, res) => {
    res.writeHead('200', { 'content-type': 'image/png' })
    res.write('d')
    res.end()
  })

  const validateForward = new ValidationStream(t, 'd')

  request.get(s.url + '/forward1').pipe(validateForward)

  validateForward.on('end', () => {
    t.end()
  })
})

tape('pipe options', (t) => {
  s.once('/opts', server.createGetResponse('opts response'))

  const optsStream = new stream.Stream()
  let optsData = ''

  optsStream.writable = true
  optsStream.write = (buf) => {
    optsData += buf
    if (optsData === 'opts response') {
      setTimeout(() => {
        t.end()
      }, 10)
    }
  }
  optsStream.end = () => {
    t.fail('end called')
  }

  request({
    url: s.url + '/opts'
  }).pipe(optsStream, { end: false })
})

tape('request.pipefilter is called correctly', (t) => {
  s.once('/pipefilter', (req, res) => {
    res.end('d')
  })
  const validatePipeFilter = new ValidationStream(t, 'd')

  const r3 = request.get(s.url + '/pipefilter')
  r3.pipe(validatePipeFilter)
  r3.pipefilter = (res, dest) => {
    t.equal(res, r3.response)
    t.equal(dest, validatePipeFilter)
    t.end()
  }
})

tape('cleanup', (t) => {
  s.close(() => {
    t.end()
  })
})
