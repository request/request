var server = require('./server')
  , assert = require('assert')
  , request = require('../index')
  ;

var s = server.createServer();
var expectedBody = "waited";
var remainingTests = 1;

s.listen(s.port, function () {
  s.on('/', function (req, resp) {
    resp.writeHead(200, {'content-type':'text/plain'})
    resp.write(expectedBody)
    resp.end()
  });
})

var shouldEmitSocketEvent = {
  url: s.url + '/',
}

var req = request(shouldEmitSocketEvent)

req.on('socket', function(socket) {
  var requestSocket = req.req.socket
  assert.equal(requestSocket, socket)
  checkDone()
})

req.on('error', function(err) {
  // I get an ECONNREFUSED error
})

function checkDone() {
  if(--remainingTests == 0) {
    console.log("All tests passed.");
    s.close();
  }
}
