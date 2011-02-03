var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();

var createPostStream = function (text) {
  var postStream = new stream.Stream();
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
  , testPutJSON : 
    { resp : createPostValidator(JSON.stringify({foo: 'bar'}))
    , method: "PUT"
    , json: {foo: 'bar'}  
    }
  , testPutMultipart : 
    { resp: createPostValidator(
        '--frontier\r\n' +
        'content-type: text/html\r\n' +
        '\r\n' +
        '<html><body>Oh hi.</body></html>' +
        '\r\n--frontier\r\n\r\n' +
        'Oh hi.' +
        '\r\n--frontier--'
        )
    , method: "PUT"
    , multipart: 
      [ {'content-type': 'text/html', 'body': '<html><body>Oh hi.</body></html>'}
      , {'body': 'Oh hi.'}
      ]
    }  
  }

var counter = 0;

for (i in tests) {
  (function () {
    var test = tests[i];
    s.on('/'+i, test.resp);
    test.uri = s.url + '/' + i;
    request(test, function (err, resp, body) {
      if (err) throw err;
      if (test.expectBody) {
        if (test.expectBody !== body) console.log(test.expectBody, body);
        assert.ok(test.expectBody === body)
      }
      counter = counter - 1;
      if (counter === 0) {
        console.log(Object.keys(tests).length+" tests passed.")
        s.close();
      }
    })
    counter++;
  })()
}
