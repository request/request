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
  server.listen(0, function () {
    server.url = 'http://localhost:' + this.address().port
    t.end()
  })
})

tape('request body stream', function (t) {
  var fpath = path.join(__dirname, 'unicycle.jpg')
  var input = fs.createReadStream(fpath, {highWaterMark: 1000})
  request({
    uri: server.url,
    method: 'POST',
    body: input,
    encoding: null
  }, function (err, res, body) {
    t.error(err)
    t.equal(body.length, fs.statSync(fpath).size)
    t.end()
  })
})

tape('after', function (t) {
  server.close(t.end)
})
