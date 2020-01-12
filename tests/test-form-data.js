'use strict'

const http = require('http')
const path = require('path')
const mime = require('mime-types')
const request = require('../index')
const fs = require('fs')
const tape = require('tape')

function runTest (t, options) {
  const remoteFile = path.join(__dirname, 'googledoodle.jpg')
  const localFile = path.join(__dirname, 'unicycle.jpg')
  const multipartFormData = {}

  const server = http.createServer((req, res) => {
    if (req.url === '/file') {
      res.writeHead(200, { 'content-type': 'image/jpg', 'content-length': 7187 })
      res.end(fs.readFileSync(remoteFile), 'binary')
      return
    }

    if (options.auth) {
      if (!req.headers.authorization) {
        res.writeHead(401, { 'www-authenticate': 'Basic realm="Private"' })
        res.end()
        return
      } else {
        t.ok(req.headers.authorization === 'Basic ' + Buffer.from('user:pass').toString('base64'))
      }
    }

    t.ok(/multipart\/form-data; boundary=--------------------------\d+/
      .test(req.headers['content-type']))

    // temp workaround
    let data = ''
    req.setEncoding('utf8')

    req.on('data', (d) => {
      data += d
    })

    req.on('end', () => {
      // check for the fields' traces

      // 1st field : my_field
      t.ok(data.indexOf('form-data; name="my_field"') !== -1)
      t.ok(data.indexOf(multipartFormData.my_field) !== -1)

      // 2nd field : my_buffer
      t.ok(data.indexOf('form-data; name="my_buffer"') !== -1)
      t.ok(data.indexOf(multipartFormData.my_buffer) !== -1)

      // 3rd field : my_file
      t.ok(data.indexOf('form-data; name="my_file"') !== -1)
      t.ok(data.indexOf('; filename="' + path.basename(multipartFormData.my_file.path) + '"') !== -1)
      // check for unicycle.jpg traces
      t.ok(data.indexOf('2005:06:21 01:44:12') !== -1)
      t.ok(data.indexOf('Content-Type: ' + mime.lookup(multipartFormData.my_file.path)) !== -1)

      // 4th field : remote_file
      t.ok(data.indexOf('form-data; name="remote_file"') !== -1)
      t.ok(data.indexOf('; filename="' + path.basename(multipartFormData.remote_file.path) + '"') !== -1)

      // 5th field : file with metadata
      t.ok(data.indexOf('form-data; name="secret_file"') !== -1)
      t.ok(data.indexOf('Content-Disposition: form-data; name="secret_file"; filename="topsecret.jpg"') !== -1)
      t.ok(data.indexOf('Content-Type: image/custom') !== -1)

      // 6th field : batch of files
      t.ok(data.indexOf('form-data; name="batch"') !== -1)
      t.ok(data.match(/form-data; name="batch"/g).length === 2)

      // check for http://localhost:nnnn/file traces
      t.ok(data.indexOf('Photoshop ICC') !== -1)
      t.ok(data.indexOf('Content-Type: ' + mime.lookup(remoteFile)) !== -1)

      res.writeHead(200)
      res.end(options.json ? JSON.stringify({ status: 'done' }) : 'done')
    })
  })

  server.listen(0, function () {
    const url = 'http://localhost:' + this.address().port
    // @NOTE: multipartFormData properties must be set here so that my_file read stream does not leak in node v0.8
    multipartFormData.my_field = 'my_value'
    multipartFormData.my_buffer = Buffer.from([1, 2, 3])
    multipartFormData.my_file = fs.createReadStream(localFile)
    multipartFormData.remote_file = request(url + '/file')
    multipartFormData.secret_file = {
      value: fs.createReadStream(localFile),
      options: {
        filename: 'topsecret.jpg',
        contentType: 'image/custom'
      }
    }
    multipartFormData.batch = [
      fs.createReadStream(localFile),
      fs.createReadStream(localFile)
    ]

    const reqOptions = {
      url: url + '/upload',
      formData: multipartFormData
    }
    if (options.json) {
      reqOptions.json = true
    }
    if (options.auth) {
      reqOptions.auth = { user: 'user', pass: 'pass', sendImmediately: false }
    }
    request.post(reqOptions, (err, res, body) => {
      t.equal(err, null)
      t.equal(res.statusCode, 200)
      t.deepEqual(body, options.json ? { status: 'done' } : 'done')
      server.close(() => {
        t.end()
      })
    })
  })
}

tape('multipart formData', (t) => {
  runTest(t, { json: false })
})

tape('multipart formData + JSON', (t) => {
  runTest(t, { json: true })
})

tape('multipart formData + basic auth', (t) => {
  runTest(t, { json: false, auth: true })
})
