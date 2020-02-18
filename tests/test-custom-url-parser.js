var tape = require('tape')
var server = require('./server')
var request = require('../index')
var destroyable = require('server-destroy')
var customUrlParser = require('postman-url-encoder').toNodeUrl

var httpServer = server.createServer()

destroyable(httpServer)

tape('setup', function (t) {
  httpServer.listen(0, function () {
    httpServer.on('/query', function (req, res) {
      res.writeHead(200)
      res.end(req.url)
    })

    httpServer.on('/redirect', function (req, res) {
      res.writeHead(301, {
        'Location': httpServer.url + '/query?q={(`*`)}'
      })
      res.end()
    })

    t.end()
  })
})

// @note: all these tests have `disableUrlEncoding` option set to true
// so that it don't do extra encoding on top of given `urlParse` option

tape('without urlParse option', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = { disableUrlEncoding: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('without urlParse option with redirect', function (t) {
  var requestUrl = httpServer.url + '/redirect'
  var options = { disableUrlEncoding: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('with urlParse option', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = {
    disableUrlEncoding: true,
    urlParse: customUrlParser
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to customUrlParser()
    t.equal(body, '/query?q={(`*`)}')
    t.end()
  })
})

tape('with urlParse option and redirect', function (t) {
  var requestUrl = httpServer.url + '/redirect'
  var options = {
    disableUrlEncoding: true,
    urlParse: customUrlParser
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to customUrlParser()
    t.equal(body, '/query?q={(`*`)}')
    t.end()
  })
})

tape('with invalid urlParse option', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = {
    disableUrlEncoding: true,
    urlParse: 'invalid option. this should be a function'
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('cleanup', function (t) {
  httpServer.destroy(function () {
    t.end()
  })
})
