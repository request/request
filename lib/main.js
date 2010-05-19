var http = require('http'),
    url = require('url'),
    sys = require('sys'),
    base64 = require('./base64');

function request (options, callback) {
  if (!options.uri) {
    throw new Error("options.uri is a required argument")
  } else {
    if (typeof options.uri == "string") {
      options.uri = url.parse(options.uri);
    }
  }
  options.followRedirect = options.followRedirect ? options.followRedirect : true;
  options.method = options.method ? options.method : 'GET';
  options.headers = options.headers ? options.headers :  {};
  if (!options.headers.host) {
    options.headers.host = options.uri.hostname;
    if (options.uri.port) {
      options.headers.host += (':'+options.uri.port)
    }
  }
  if (!options.uri.pathname) {options.uri.pathname = '/'}
  if (!options.uri.port) {
    if (options.uri.protocol == 'http:') {options.uri.port = 80}
    else if (options.uri.protocol == 'https:') {options.uri.port = 443}
  }
  
  var clientErrorHandler = function (error) {
    callback(error);
  }
  if (options.uri.protocol == 'https:') {
    var secure = true; 
  } else {
    var secure = false;
  }
  options.client = options.client ? options.client : http.createClient(options.uri.port, options.uri.hostname, secure);
  options.client.addListener('error', clientErrorHandler);
  
  if (options.uri.auth && !options.headers.authorization) {
    options.headers.authorization = "Basic " + base64.encode(options.uri.auth);
  }
  options.pathname = options.uri.search ? (options.uri.pathname + options.uri.search) : options.uri.pathname;
  if (options.body) {options.headers['content-length'] = options.body.length}

  options.request = options.client.request(options.method, options.pathname, options.headers);
  
  options.request.addListener("response", function (response) {
    var buffer = '';
    response.addListener("data", function (chunk) {
      buffer += chunk;
    })
    response.addListener("end", function () {
      if (response.statusCode > 299 && response.statusCode < 400 && options.followRedirect && response.headers.location) {
        options.uri = response.headers.location;
        delete options.client; 
        if (options.headers) {
          delete options.headers.host;
        }
        request(options, callback);
        return;
      }
      options.client.removeListener("error", clientErrorHandler);
      callback(null, response, buffer);
    })
  })
  
  if (options.body) {
    options.request.write(options.body, 'binary');
  }
  options.request.end();
}

module.exports = request;