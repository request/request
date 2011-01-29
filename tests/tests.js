var server = require('./server')
  , events = require('events')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();

var createPostStream = function (text) {
  var postStream = new events.EventEmitter();
  postStream.writeable = true;
  postStream.readable = true;
  setTimeout(function () {postStream.emit('data', new Buffer(text)); postStream.emit('end')}, 0);
  return postStream;
}
var createPostValidator = function (text) {
  var l = function (req, resp) {
    var r = '';
    req.on('data', function (chunk) {r += chunk})
    req.on('end', function () {
    if (r !== text) console.log(r, text);
    assert.ok(r === text)
    resp.writeHead(200, {'content-type':'text/plain'})
    resp.write('OK')
    resp.end()
    })
  }
  return l;
}
var createGetResponse = function (text) {
  var l = function (req, resp) {
    resp.writeHead(200, {'content-type':'text/plain'})
    resp.write(text)
    resp.end()
  }
  return l;
}

var tests = 
  { testGet : 
    { resp : createGetResponse("TESTING!") 
    , expectBody: "TESTING!"
    }
  , testPutString : 
    { resp : createPostValidator("PUTTINGDATA")
    , method : "PUT"
    , body : "PUTTINGDATA"
    }
  , testPutBuffer :
    { resp : createPostValidator("PUTTINGDATA")
    , method : "PUT"
    , body : new Buffer("PUTTINGDATA")
    }
  , testPutStream :
    { resp : createPostValidator("PUTTINGDATA")
    , method : "PUT"
    , requestBodyStream : createPostStream("PUTTINGDATA")
    }
  }

var counter = 0;

for (i in tests) {
  (function () {
    var test = tests[i];
    s.on('/'+i, test.resp);
    test.uri = s.url + '/' + i;
    request(test, function (err, resp, body) {
      if (test.expectBody) {
        assert.ok(test.expectBody === body)
      }
      counter = counter - 1;
      if (counter === 0) {
        s.close();
      }
    })
    counter++;
  })()
}