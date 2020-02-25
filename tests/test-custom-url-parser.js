var tape = require('tape')
var server = require('./server')
var request = require('../index')
var destroyable = require('server-destroy')
var urlEncoder = require('postman-url-encoder')

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

    httpServer.on('/relative_redirect', function (req, res) {
      res.writeHead(301, {
        'Location': '/query?q={(`*`)}'
      })
      res.end()
    })

    t.end()
  })
})

// @note: all these tests have `disableUrlEncoding` option set to true
// so that it don't do extra encoding on top of given `urlParse` option

tape('without urlParser option', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = { disableUrlEncoding: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('without urlParser option with redirect', function (t) {
  var requestUrl = httpServer.url + '/redirect'
  var options = { disableUrlEncoding: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('without urlParser option and redirect with relative URL', function (t) {
  var requestUrl = httpServer.url + '/relative_redirect'
  var options = { disableUrlEncoding: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('with urlParser option', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = {
    disableUrlEncoding: true,
    urlParser: {
      parse: urlEncoder.toNodeUrl,
      resolve: urlEncoder.resolveNodeUrl
    }
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to customUrlParser()
    t.equal(body, '/query?q={(`*`)}')
    t.end()
  })
})

tape('with urlParser option and redirect', function (t) {
  var requestUrl = httpServer.url + '/redirect'
  var options = {
    disableUrlEncoding: true,
    urlParser: {
      parse: urlEncoder.toNodeUrl,
      resolve: urlEncoder.resolveNodeUrl
    }
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to customUrlParser()
    t.equal(body, '/query?q={(`*`)}')
    t.end()
  })
})

tape('with urlParser option and redirect with relative URL', function (t) {
  var requestUrl = httpServer.url + '/relative_redirect'
  var options = {
    disableUrlEncoding: true,
    urlParser: {
      parse: urlEncoder.toNodeUrl,
      resolve: urlEncoder.resolveNodeUrl
    }
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to customUrlParser()
    t.equal(body, '/query?q={(`*`)}')
    t.end()
  })
})

tape('with invalid urlParser option', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = {
    disableUrlEncoding: true,
    urlParser: 'invalid option. this should be an object'
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)

    // it should be encoded according to url.parse()
    t.equal(body, '/query?q=%7B(%60*%60)%7D')
    t.end()
  })
})

tape('with urlParser option but missing required methods', function (t) {
  var requestUrl = httpServer.url + '/query?q={(`*`)}'
  var options = {
    disableUrlEncoding: true,
    urlParser: {
      parse: urlEncoder.toNodeUrl
      // resolve method is missing in this option
    }
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
