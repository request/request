var http = require('http')
  , url = require('url')
  , sys = require('sys')
  ;

var toBase64 = function(str) {
  return (new Buffer(str || "", "ascii")).toString("base64");
};

function request (options, callback) {
  callback = callback || function () {};

  if (options.url) {
    // People use this property instead all the time so why not just support it.
    options.uri = options.url;
    delete options.url;
  }

  if (!options.uri) {
    throw new Error("options.uri is a required argument");
  } else {
    if (typeof options.uri == "string") options.uri = url.parse(options.uri);
  }
  if (options.proxy) {
    if (typeof options.proxy == 'string') options.proxy = url.parse(options.proxy);
  }

  options._redirectsFollowed = options._redirectsFollowed || 0;
  options.maxRedirects = options.maxRedirects || 10;

  if (!('followRedirect' in options)) {
      options.followRedirect = true;
  }
  options.method = options.method || 'GET';
  options.headers = options.headers || {};

  var setHost = false;
  if (!options.headers.host) {
    options.headers.host = options.uri.hostname;
    if (options.uri.port) {
      if ( !(options.uri.port === 80 && options.uri.protocol === 'http:') &&
           !(options.uri.port === 443 && options.uri.protocol === 'https:') )
      options.headers.host += (':'+options.uri.port);
    }
    setHost = true;
  }

  if (!options.uri.pathname) {options.uri.pathname = '/';}
  if (!options.uri.port) {
    if (options.uri.protocol == 'http:') {options.uri.port = 80;}
    else if (options.uri.protocol == 'https:') {options.uri.port = 443;}
  }

  if (options.bodyStream) {
    sys.error('options.bodyStream is deprecated. use options.reponseBodyStream instead.');
    options.responseBodyStream = options.bodyStream;
  }
  if (!options.client) {
    if (options.proxy) {
      options.client = http.createClient(options.proxy.port, options.proxy.hostname, options.proxy.protocol === 'https:');
    } else {
      options.client = http.createClient(options.uri.port, options.uri.hostname, options.uri.protocol === 'https:');
    }
  }

  var clientErrorHandler = function (error) {
    if (setHost) delete options.headers.host;
    callback(error);
  };
  options.client.addListener('error', clientErrorHandler);

  if (options.uri.auth && !options.headers.authorization) {
    options.headers.authorization = "Basic " + toBase64(options.uri.auth);
  }
  if (options.proxy && options.proxy.auth && !options.headers['proxy-authorization']) {
    options.headers['proxy-authorization'] = "Basic " + toBase64(options.proxy.auth);
  }

  options.fullpath = options.uri.href.replace(options.uri.protocol + '//' + options.uri.host, '');
  if (options.fullpath.length === 0) options.fullpath = '/';

  if (options.proxy) options.fullpath = (options.uri.protocol + '//' + options.uri.host + options.fullpath);

  if ('body' in options) {
    options.body = Buffer.isBuffer(options.body) ? options.body : new Buffer(options.body);
    options.headers['content-length'] = options.body.length;
  }
  options.request = options.client.request(options.method, options.fullpath, options.headers);
  options.request.addListener("response", function (response) {
    if (setHost) delete options.headers.host;
    response.on("end", function () {
      options.client.removeListener("error", clientErrorHandler);
    });

    if (response.statusCode >= 300 && response.statusCode < 400 && options.followRedirect && response.headers.location) {
      if (options._redirectsFollowed >= options.maxRedirects) client.emit('error', new Error("Exceeded maxRedirects. Probably stuck in a redirect loop."));
      options._redirectsFollowed += 1;
      if (!/^https?:/.test(response.headers.location)) {
        response.headers.location = url.resolve(options.uri.href, response.headers.location);
      }
      options.uri = response.headers.location;
      delete options.client;
      if (options.headers) {
        delete options.headers.host;
      }
      request(options, callback);
      return; // Ignore the rest of the response
    } else {
      options._redirectsFollowed = 0;
      if (options.encoding) response.setEncoding(options.encoding);
      if (options.responseBodyStream) {
        sys.pump(response, options.responseBodyStream);
        callback(null, response, options.responseBodyStream);
      } else {
        var buffer = '';
        response.on("data", function (chunk) {
          buffer += chunk;
        }).on("end", function () {
          callback(null, response, buffer);
        });
      }
    }
  });

  if (options.body) {
    options.request.write(options.body, 'binary');
    options.request.end();
  } else if (options.requestBodyStream) {
    sys.pump(options.requestBodyStream, options.request);
  } else {
    options.request.end();
  }
}

module.exports = request;

request.get = request;
request.post = function () {arguments[0].method = 'POST', request.apply(request, arguments);};
request.put = function () {arguments[0].method = 'PUT', request.apply(request, arguments);};
request.head = function () {arguments[0].method = 'HEAD', request.apply(request, arguments);};
