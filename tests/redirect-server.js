var http = require('http')
  , fs   = require('fs')
  , path = require('path')
  , url  = require('url')

exports.createServer = function(port) {
  port = port || 6767;

  server = http.createServer(function(req, resp) {
    parsedUrl = url.parse(req.url, true)
    redirectTo(req, resp, parsedUrl)
  });

  server.listen(port);
  server.url = "http://localhost:" + port;
  return server;
}


var redirectTo = function(req, resp, parsedUrl) {
  location = parsedUrl.pathname;

  documentJSON = fs.readFileSync( path.resolve( "fixtures/" + location + ".json" ) );
  document = JSON.parse(documentJSON);

  if (document.headers.hasOwnProperty('location')) {
    resp.writeHead(302, document.headers);
    resp.write(document.body);
    resp.end()
  } else {
    resp.writeHead(200, document.headers);
    resp.write(document.body);
    resp.end()
  }
}
