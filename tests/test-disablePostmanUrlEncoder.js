var url = require('url')
var tape = require('tape')
var server = require('./server')
var request = require('../index')
var destroyable = require('server-destroy')

var plainServer = server.createServer()

destroyable(plainServer)

tape('setup', function (t) {
  plainServer.listen(0, function () {
    plainServer.on('/query', function (req, res) {
      res.writeHead(200)
      res.end(req.url)
    })

    plainServer.on('/redirect', function (req, res) {
      res.writeHead(301, {
        'Location': 'http://localhost:' + plainServer.port + '/query?%E9%82%AE=%E5%B7%AE'
      })
      res.end()
    })

    plainServer.on('/redirect2', function (req, res) {
      res.writeHead(301, {
        'Location': 'http://localhost:' + plainServer.port + '/query?!foo!=!bar!'
      })
      res.end()
    })

    t.end()
  })
})

tape('UTF-8 URL without disablePostmanUrlEncoder option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/query?邮=差'

  request(requestUrl, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?%E9%82%AE=%E5%B7%AE')
    t.end()
  })
})

tape('URL containing character \'!\' without disablePostmanUrlEncoder option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/query?!foo!=!bar!'

  request(requestUrl, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?%21foo%21=%21bar%21')
    t.end()
  })
})

tape('Encoded UTF-8 URL in redirect without disablePostmanUrlEncoder option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/redirect'

  request(requestUrl, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?%E9%82%AE=%E5%B7%AE')
    t.end()
  })
})

tape('URL containing character \'!\' in redirect without disablePostmanUrlEncoder option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/redirect2'

  request(requestUrl, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?%21foo%21=%21bar%21')
    t.end()
  })
})

tape('Encoded UTF-8 URL with disablePostmanUrlEncoder=true option', function (t) {
  // given URL should be pre-encoded because encoder is disabled. So the request will fail otherwise
  var requestUrl = 'http://localhost:' + plainServer.port + '/query?%E9%82%AE=%E5%B7%AE'
  var options = {
    disablePostmanUrlEncoder: true
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?%E9%82%AE=%E5%B7%AE')
    t.end()
  })
})

tape('URL containing character \'!\' with disablePostmanUrlEncoder=true option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/query?!foo!=!bar!'
  var options = { disablePostmanUrlEncoder: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?!foo!=!bar!')
    t.end()
  })
})

tape('Encoded UTF-8 URL in redirect with disablePostmanUrlEncoder=true option', function (t) {
  // given URL should be pre-encoded because encoder is disabled. So the request will fail otherwise
  var requestUrl = 'http://localhost:' + plainServer.port + '/query?%E9%82%AE=%E5%B7%AE'
  var options = {
    disablePostmanUrlEncoder: true
  }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?%E9%82%AE=%E5%B7%AE')
    t.end()
  })
})

tape('URL with character \'!\' in redirect with disablePostmanUrlEncoder=true option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/redirect2'
  var options = { disablePostmanUrlEncoder: true }

  request(requestUrl, options, function (err, res, body) {
    t.equal(err, null)
    t.equal(body, '/query?!foo!=!bar!')
    t.end()
  })
})

tape('UTF-8 URL with disablePostmanUrlEncoder=true option', function (t) {
  var requestUrl = 'http://localhost:' + plainServer.port + '/query?邮=差'
  var options = { disablePostmanUrlEncoder: true }
  
  // this request should fail because encoding is off and URL contains UTF-8 characters
  request(requestUrl, options, function (err, res, body) {
    t.notEqual(err, null)
    t.equal(body, undefined)
    t.end()
  })
})

tape('cleanup', function (t) {
  plainServer.destroy(function () {
    t.end()
  })
})
