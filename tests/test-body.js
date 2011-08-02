var server = require('./server')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  , request = require('../main.js')
  ;

var s = server.createServer();

var tests = 
  { testGet : 
    { resp : server.createGetResponse("TESTING!") 
    , expectBody: "TESTING!"
    }
  , testGetJSON : 
    { resp : server.createGetResponse('{"test":true}', 'application/json')
    , json : true
    , expectBody: {"test":true}
    }
  , testPutString : 
    { resp : server.createPostValidator("PUTTINGDATA")
    , method : "PUT"
    , body : "PUTTINGDATA"
    }
  , testPutBuffer :
    { resp : server.createPostValidator("PUTTINGDATA")
    , method : "PUT"
    , body : new Buffer("PUTTINGDATA")
    }
  , testPutStream :
    { resp : server.createPostValidator("PUTTINGDATA")
    , method : "PUT"
    , requestBodyStream : server.createPostStream("PUTTINGDATA")
    }
  , testPutJSON : 
    { resp : server.createPostValidator(JSON.stringify({foo: 'bar'}))
    , method: "PUT"
    , json: {foo: 'bar'}  
    }
  , testPutMultipart : 
    { resp: server.createPostValidator(
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
        assert.deepEqual(test.expectBody, body)
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
