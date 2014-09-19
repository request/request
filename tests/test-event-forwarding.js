var server = require('./server')
  , assert = require('assert')
  , request = require('../index')
  ;

var s = server.createServer();
var expectedBody = "waited";
var remainingTests = 2;

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

var req = request(shouldEmitSocketEvent, function() {
  s.close();
})

req.on('socket', function(socket) {
  var requestSocket = req.req.socket
  assert.equal(requestSocket, socket)
  checkDone()
})

function checkDone() {
  if(--remainingTests == 0) {
    console.log("All tests passed.");
  }
}
