var http = require('http');

exports.createServer =  function (port) {
  port = port || 6767
  var s = http.createServer(function (req, resp) {
    s.emit(req.url, req, resp);
  })
  s.listen(port)
  s.url = 'http://localhost:'+port
  return s;
}
