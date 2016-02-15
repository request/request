
var fs = require('fs')
var path = require('path')
var http = require('http')
var tape = require('tape')
var request = require('../')
var server


tape('before', function (t) {
  server = http.createServer()
  server.on('request', function (req, res) {
    req.pipe(res)
  })
  server.listen(6767, t.end)
})

tape('request body stream', function (t) {
  var fpath = path.join(__dirname, 'unicycle.jpg')
  var input = fs.createReadStream(fpath, {highWaterMark: 1000})
  request({
    uri: 'http://localhost:6767',
    method: 'POST',
    body: input,
    encoding: null
  }, function (err, res, body) {
    t.equal(body.length, fs.statSync(fpath).size)
    t.end()
  })
})

tape('after', function (t) {
  server.close(t.end)
})
