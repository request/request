'use strict'

var server = require('./server')
var stream = require('stream')
var fs = require('fs')
var request = require('../index')
var path = require('path')
var util = require('util')
var tape = require('tape')

var s = server.createServer()

s.on('/cat', function (req, res) {
  if (req.method === 'GET') {
    res.writeHead(200, {
      'content-type': 'text/plain-test',
      'content-length': 4
    })
    res.end('asdf')
  } else if (req.method === 'PUT') {
    var body = ''
    req.on('data', function (chunk) {
      body += chunk
    }).on('end', function () {
      res.writeHead(201)
      res.end()
      s.emit('catDone', req, res, body)
    })
  }
})

s.on('/doodle', function (req, res) {
  if (req.headers['x-oneline-proxy']) {
    res.setHeader('x-oneline-proxy', 'yup')
  }
  res.writeHead('200', { 'content-type': 'image/jpeg' })
  fs.createReadStream(path.join(__dirname, 'googledoodle.jpg')).pipe(res)
})

function ValidationStream (t, str) {
  this.str = str
  this.buf = ''
  this.on('data', function (data) {
    this.buf += data
  })
  this.on('end', function () {
    t.equal(this.str, this.buf)
  })
  this.writable = true
}

util.inherits(ValidationStream, stream.Stream)

ValidationStream.prototype.write = function (chunk) {
  this.emit('data', chunk)
}

ValidationStream.prototype.end = function (chunk) {
  if (chunk) {
    this.emit('data', chunk)
  }
  this.emit('end')
}

tape('setup', function (t) {
  s.listen(0, function () {
    t.end()
  })
})

tape('piping to a request object', function (t) {
  s.once('/push', server.createPostValidator('mydata'))

  var mydata = new stream.Stream()
  mydata.readable = true

  var r1 = request.put({
    url: s.url + '/push'
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.equal(body, 'mydata')
    t.end()
  })
  mydata.pipe(r1)

  mydata.emit('data', 'mydata')
  mydata.emit('end')
})

tape('piping to a request object with invalid uri', function (t) {
  var mybodydata = new stream.Stream()
  mybodydata.readable = true

  var r2 = request.put({
    url: '/bad-uri',
    json: true
  }, function (err, res, body) {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Invalid URI "/bad-uri"')
    t.end()
  })
  mybodydata.pipe(r2)

  mybodydata.emit('data', JSON.stringify({ foo: 'bar' }))
  mybodydata.emit('end')
})

tape('piping to a request object with a json body', function (t) {
  var obj = {foo: 'bar'}
  var json = JSON.stringify(obj)
  s.once('/push-json', server.createPostValidator(json, 'application/json'))
  var mybodydata = new stream.Stream()
  mybodydata.readable = true

  var r2 = request.put({
    url: s.url + '/push-json',
    json: true
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.statusCode, 200)
    t.deepEqual(body, obj)
    t.end()
  })
  mybodydata.pipe(r2)

  mybodydata.emit('data', JSON.stringify({ foo: 'bar' }))
  mybodydata.emit('end')
})

tape('piping from a request object', function (t) {
  s.once('/pull', server.createGetResponse('mypulldata'))

  var mypulldata = new stream.Stream()
  mypulldata.writable = true

  request({
    url: s.url + '/pull'
  }).pipe(mypulldata)

  var d = ''

  mypulldata.write = function (chunk) {
    d += chunk
  }
  mypulldata.end = function () {
    t.equal(d, 'mypulldata')
    t.end()
  }
})

tape('pause when piping from a request object', function (t) {
  s.once('/chunks', function (req, res) {
    res.writeHead(200, {
      'content-type': 'text/plain'
    })
    res.write('Chunk 1')
    setTimeout(function () { res.end('Chunk 2') }, 10)
  })

  var chunkNum = 0
  var paused = false
  request({
    url: s.url + '/chunks'
  })
    .on('data', function (chunk) {
      var self = this

      t.notOk(paused, 'Only receive data when not paused')

      ++chunkNum
      if (chunkNum === 1) {
        t.equal(chunk.toString(), 'Chunk 1')
        self.pause()
        paused = true
        setTimeout(function () {
          paused = false
          self.resume()
        }, 100)
      } else {
        t.equal(chunk.toString(), 'Chunk 2')
      }
    })
    .on('end', t.end.bind(t))
})

tape('pause before piping from a request object', function (t) {
  s.once('/pause-before', function (req, res) {
    res.writeHead(200, {
      'content-type': 'text/plain'
    })
    res.end('Data')
  })

  var paused = true
  var r = request({
    url: s.url + '/pause-before'
  })
  r.pause()
  r.on('data', function (data) {
    t.notOk(paused, 'Only receive data when not paused')
    t.equal(data.toString(), 'Data')
  })
  r.on('end', t.end.bind(t))

  setTimeout(function () {
    paused = false
    r.resume()
  }, 100)
})

var fileContents = fs.readFileSync(__filename)
function testPipeFromFile (testName, hasContentLength) {
  tape(testName, function (t) {
    s.once('/pushjs', function (req, res) {
      if (req.method === 'PUT') {
        t.equal(req.headers['content-type'], 'application/javascript')
        t.equal(
          req.headers['content-length'],
          (hasContentLength ? '' + fileContents.length : undefined))
        var body = ''
        req.setEncoding('utf8')
        req.on('data', function (data) {
          body += data
        })
        req.on('end', function () {
          res.end()
          t.equal(body, fileContents.toString())
          t.end()
        })
      } else {
        res.end()
      }
    })
    var r = request.put(s.url + '/pushjs')
    fs.createReadStream(__filename).pipe(r)
    if (hasContentLength) {
      r.setHeader('content-length', fileContents.length)
    }
  })
}

// TODO Piping from a file does not send content-length header
testPipeFromFile('piping from a file', false)
testPipeFromFile('piping from a file with content-length', true)

tape('piping to and from same URL', function (t) {
  s.once('catDone', function (req, res, body) {
    t.equal(req.headers['content-type'], 'text/plain-test')
    t.equal(req.headers['content-length'], '4')
    t.equal(body, 'asdf')
    t.end()
  })
  request.get(s.url + '/cat')
    .pipe(request.put(s.url + '/cat'))
})

tape('piping between urls', function (t) {
  s.once('/catresp', function (req, res) {
    request.get(s.url + '/cat').pipe(res)
  })

  request.get(s.url + '/catresp', function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['content-type'], 'text/plain-test')
    t.equal(res.headers['content-length'], '4')
    t.end()
  })
})

tape('writing to file', function (t) {
  var doodleWrite = fs.createWriteStream(path.join(__dirname, 'test.jpg'))

  request.get(s.url + '/doodle').pipe(doodleWrite)

  doodleWrite.on('close', function () {
    t.deepEqual(
      fs.readFileSync(path.join(__dirname, 'googledoodle.jpg')),
      fs.readFileSync(path.join(__dirname, 'test.jpg')))
    fs.unlinkSync(path.join(__dirname, 'test.jpg'))
    t.end()
  })
})

tape('one-line proxy', function (t) {
  s.once('/onelineproxy', function (req, res) {
    var x = request(s.url + '/doodle')
    req.pipe(x)
    x.pipe(res)
  })

  request.get({
    uri: s.url + '/onelineproxy',
    headers: { 'x-oneline-proxy': 'nope' }
  }, function (err, res, body) {
    t.equal(err, null)
    t.equal(res.headers['x-oneline-proxy'], 'yup')
    t.equal(body, fs.readFileSync(path.join(__dirname, 'googledoodle.jpg')).toString())
    t.end()
  })
})

tape('piping after response', function (t) {
  s.once('/afterresponse', function (req, res) {
    res.write('d')
    res.end()
  })

  var rAfterRes = request.post(s.url + '/afterresponse')

  rAfterRes.on('response', function () {
    var v = new ValidationStream(t, 'd')
    rAfterRes.pipe(v)
    v.on('end', function () {
      t.end()
    })
  })
})

tape('piping through a redirect', function (t) {
  s.once('/forward1', function (req, res) {
    res.writeHead(302, { location: '/forward2' })
    res.end()
  })
  s.once('/forward2', function (req, res) {
    res.writeHead('200', { 'content-type': 'image/png' })
    res.write('d')
    res.end()
  })

  var validateForward = new ValidationStream(t, 'd')

  request.get(s.url + '/forward1').pipe(validateForward)

  validateForward.on('end', function () {
    t.end()
  })
})

tape('pipe options', function (t) {
  s.once('/opts', server.createGetResponse('opts response'))

  var optsStream = new stream.Stream()
  var optsData = ''

  optsStream.writable = true
  optsStream.write = function (buf) {
    optsData += buf
    if (optsData === 'opts response') {
      setTimeout(function () {
        t.end()
      }, 10)
    }
  }
  optsStream.end = function () {
    t.fail('end called')
  }

  request({
    url: s.url + '/opts'
  }).pipe(optsStream, { end: false })
})

tape('request.pipefilter is called correctly', function (t) {
  s.once('/pipefilter', function (req, res) {
    res.end('d')
  })
  var validatePipeFilter = new ValidationStream(t, 'd')

  var r3 = request.get(s.url + '/pipefilter')
  r3.pipe(validatePipeFilter)
  r3.pipefilter = function (res, dest) {
    t.equal(res, r3.response)
    t.equal(dest, validatePipeFilter)
    t.end()
  }
})

tape('cleanup', function (t) {
  s.close(function () {
    t.end()
  })
})
