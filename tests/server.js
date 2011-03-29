var http = require('http')
  , events = require('events')
  , stream = require('stream')
  , assert = require('assert')
  ;

exports.createServer =  function (port) {
  port = port || 6767
  var s = http.createServer(function (req, resp) {
    s.emit(req.url, req, resp);
  })
  s.listen(port)
  s.url = 'http://localhost:'+port
  return s;
}

exports.createPostStream = function (text) {
  var postStream = new stream.Stream();
  postStream.writeable = true;
  postStream.readable = true;
  setTimeout(function () {postStream.emit('data', new Buffer(text)); postStream.emit('end')}, 0);
  return postStream;
}
exports.createPostValidator = function (text) {
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
exports.createGetResponse = function (text) {
  var l = function (req, resp) {
    resp.writeHead(200, {'content-type':'text/plain'})
    resp.write(text)
    resp.end()
  }
  return l;
}

exports.createEtagResponse = function (etag, code) {
    var l = function(req, resp) {
        if (code == 200 && req.method == 'GET' && req.headers['if-none-match'] == etag) {
            resp.writeHead(304)
        } else {
            if (code == 200) {
              resp.writeHead(200, {'ETag': etag});
            } else {
              resp.writeHead(code);
            }
        }
        resp.end();
    }
    return l;
}

exports.createExpiresResponse = function (modified) {
    //modified is a list of dates. one will be popped off the right
    //and used as the resources modified time
    var l = function(req, resp) {
        var ims = req.headers['if-modified-since'];
        var lastModified = modified.pop()

        if (req.method == 'GET' && (ims && ims == lastModified)) {
          resp.writeHead(304)
        } else {
          resp.writeHead(200, {'last-modified': lastModified});
        }
        resp.end();
    }
    return l;
}

exports.createCalledOnceResponse = function (dt, expires) {
  var called = 0;
  var l = function (req, resp) {
    assert.ok(called <= 1);
    resp.writeHead(200, {
      'date': dt,
      expires: expires
    });
    resp.end();
  }
  return l;
}
