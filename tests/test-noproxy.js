/*
** Test noproxy configuration.
**
** We create a server and a proxy.
** Server listens on localhost:4242.
** Proxy listens on localhost:8080.
** The proxy redirects all requests to /proxy on the server.
** On the server, /proxy sends "proxy" .
** When server is directly requested, it answers with "noproxy" .
**
**
** So we perform 2 tests, both with proxy equal to "http://localhost:8080".
** -A test is performed with noproxy equal to "null". In this case,
**  the server responds with "proxy" because the proxy is used.
** -In the other test, noproxy equal "localhost, example.com".
**  Since localhost is part of noproxy, request is made directly
**  to the server and proxy is ignored.
*/

var assert = require("assert")
  , http = require('http')
  , request = require('../index.js')
  //We create a server and a proxy.
  , server = http.createServer(function(req, res){
      res.statusCode = 200
      if(req.url == '/proxy') {
        res.end('proxy')
      } else {
        res.end('noproxy')
      }
    })
  , proxy = http.createServer(function (req, res) {
      res.statusCode = 200
      var url = 'http://localhost:4242/proxy'
      var x = request(url)
      req.pipe(x)
      x.pipe(res)
    })
  ;

//Launch server and proxy
var initialize = function (cb) {
  server.listen(4242, 'localhost', function () {
    proxy.listen(8080, 'localhost', cb)
  })
}

//Tests
initialize(function () {
  //Checking the route for server and proxy
  request.get("http://localhost:4242/test", function (err, res, body) {
    assert.equal(res.statusCode, 200)
    request.get("http://localhost:4242/proxy", function (err, res2, body) {
      assert.equal(res2.statusCode, 200)
      request.get("http://localhost:8080/test", function (err, res3, body) {
        assert.equal(res3.statusCode, 200)
        makeNoProxyTest(function () {
          makeProxyTest(function () {
            closeServer(server)
            closeServer(proxy)
          })
        })
      })
    })
  })
})

//Request with noproxy
var makeNoProxyTest = function (cb) {
  request ({
    url: 'http://localhost:4242/test',
    proxy: 'http://localhost:8080',
    noproxy: 'localhost, example.com'
  }, function (err, res, body) {
    assert.equal(body, 'noproxy')
    cb()
  })
}

//Request with proxy
var makeProxyTest = function (cb) {
  request ({
    url: 'http://localhost:4242/test',
    proxy: 'http://localhost:8080',
    noproxy: 'null'
  }, function (err, res, body) {
    assert.equal(body, 'proxy')
    cb()
  })
}

var closeServer = function (s) {
  s.close()
}
