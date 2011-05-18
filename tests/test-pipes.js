var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer(3453);

passes = 0;

function check () {
  if (passes === 3) {
    console.log('All tests passed.')
    process.exit();
  }
}

// Test pipeing to a request object
s.once('/push', server.createPostValidator("mydata"));

var mydata = new stream.Stream();
mydata.readable = true

var r1 = request.put({url:'http://localhost:3453/push'}, function () {
  passes += 1;
  check();
})
mydata.pipe(r1)

mydata.emit('data', 'mydata');
mydata.emit('end');


// Test pipeing from a request object.
s.once('/pull', server.createGetResponse("mypulldata"));

var mypulldata = new stream.Stream();
mypulldata.writable = true

request({url:'http://localhost:3453/pull'}).pipe(mypulldata)

var d = '';

mypulldata.write = function (chunk) {
  d += chunk;
}
mypulldata.end = function () {
  assert.ok(d === 'mypulldata');
  passes += 1
  check();
};


s.on('/cat', function (req, resp) {
  if (req.method === "GET") {
    resp.writeHead(200, {'content-type':'text/plain', 'content-length':4});
    resp.write('asdf');
    resp.end()
  } else if (req.method === "PUT") {
    assert.ok(req.headers['content-type'] === 'text/plain');
    assert.ok(req.headers['content-length'] == 4)
    var validate = '';
    req.on('data', function (chunk) {validate += chunk})
    req.on('end', function () {
      resp.writeHead(201);
      resp.end();
      assert.ok(validate === 'asdf');
      passes += 1;
      check();
    })
  }
})

request.get('http://localhost:3453/cat').pipe(request.put('http://localhost:3453/cat'))

