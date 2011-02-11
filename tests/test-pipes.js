var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer(3453);

passes = 0;

function check () {
  if (passes === 2) {
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

