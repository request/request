var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , fs = require('fs')
  , request = require('../main.js')
  , path = require('path')
  ;

var s = server.createServer(3453);

passes = 0;

var check = function () {
  if (passes === 5) {
    console.log('All tests passed.')
    setTimeout(function () {
      process.exit();
    }, 500)
  }
  if (passes > 6) throw new Error('Need to update for more failures')
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
    resp.writeHead(200, {'content-type':'text/plain-test', 'content-length':4});
    resp.write('asdf');
    resp.end()
  } else if (req.method === "PUT") {
    assert.ok(req.headers['content-type'] === 'text/plain-test');
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
s.on('/pushjs', function (req, resp) {
  if (req.method === "PUT") {
    assert.ok(req.headers['content-type'] === 'text/javascript');
    passes += 1;
    check();
  }
})
s.on('/catresp', function (req, resp) {
  request.get('http://localhost:3453/cat').pipe(resp)
})
s.on('/doodle', function (req, resp) {
  resp.writeHead('200', {'content-type':'image/png'})
  fs.createReadStream(path.join(__dirname, 'googledoodle.png')).pipe(resp)
})

fs.createReadStream(__filename).pipe(request.put('http://localhost:3453/pushjs'))

request.get('http://localhost:3453/cat').pipe(request.put('http://localhost:3453/cat'))

request.get('http://localhost:3453/catresp', function (e, resp, body) {
  assert.ok(resp.headers['content-type'] === 'text/plain-test');
  assert.ok(resp.headers['content-length'] == 4)
  passes += 1
  check();
})

var doodleWrite = fs.createWriteStream(path.join(__dirname, 'test.png'))

request.get('http://localhost:3453/doodle').pipe(doodleWrite)

doodleWrite.on('close', function () {
  assert.deepEqual(fs.readFileSync(path.join(__dirname, 'googledoodle.png')), fs.readFileSync(path.join(__dirname, 'test.png')))
  check()
})

process.on('exit', function () {
  fs.unlinkSync(path.join(__dirname, 'test.png'))
})