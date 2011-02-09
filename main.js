// Copyright 2010-2011 Mikeal Rogers
// 
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
// 
//        http://www.apache.org/licenses/LICENSE-2.0
// 
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var http = require('http')
  , https = require('https')
  , url = require('url')
  , util = require('util')
  , stream = require('stream')
  , qs = require('querystring')
  ;

var toBase64 = function(str) {
  return (new Buffer(str || "", "ascii")).toString("base64");
};

var isUrl = /^https?:/;

var globalPool = {};

var Request = function (options) {
  stream.Stream.call(this);
  this.readable = true;
  this.writable = true;
  
  for (i in options) {
    this[i] = options[i];
  }
  if (!this.pool) this.pool = globalPool;
}
util.inherits(Request, stream.Stream);
Request.prototype.getAgent = function (host, port) {
  if (!this.pool[host+':'+port]) {
    this.pool[host+':'+port] = new this.httpModule.Agent({host:host, port:port});
  }
  return this.pool[host+':'+port];
}

Request.prototype.pipe = function (dest) {
  this.dest = dest;
}
Request.prototype.request = function () {  
  var options = this;
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
  options.maxRedirects = (options.maxRedirects !== undefined) ? options.maxRedirects : 10;
  options.followRedirect = (options.followRedirect !== undefined) ? options.followRedirect : true;

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

  if (options.bodyStream || options.responseBodyStream) {
    console.error('options.bodyStream and options.responseBodyStream is deprecated. You should now send the request object to stream.pipe()');
    this.pipe(options.responseBodyStream || options.bodyStream)
  }
  
  if (options.proxy) {
    options.port = options.proxy.port;
    options.host = options.proxy.hostname;
    // options.client = http.createClient(options.proxy.port, options.proxy.hostname, options.proxy.protocol === 'https:');
  } else {
    options.port = options.uri.port;
    options.host = options.uri.hostname;
    // options.client = http.createClient(options.uri.port, options.uri.hostname, options.uri.protocol === 'https:');
  }
  
  if (options.onResponse === true) {
    options.onResponse = options.callback;
    delete options.callback;
  }
  
  var clientErrorHandler = function (error) {
    if (setHost) delete options.headers.host;
    if (options.onResponse) options.onResponse(error); 
    if (options.callback) options.callback(error);
  };

  if (options.uri.auth && !options.headers.authorization) {
    options.headers.authorization = "Basic " + toBase64(options.uri.auth.split(':').map(qs.unescape).join(':'));
  }
  if (options.proxy && options.proxy.auth && !options.headers['proxy-authorization']) {
    options.headers['proxy-authorization'] = "Basic " + toBase64(options.proxy.auth.split(':').map(qs.unescape).join(':'));
  }

  options.path = options.uri.href.replace(options.uri.protocol + '//' + options.uri.host, '');
  if (options.path.length === 0) options.path = '/';

  if (options.proxy) options.path = (options.uri.protocol + '//' + options.uri.host + options.path);

  if (options.json) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(options.json);
  } else if (options.multipart) {
    options.body = '';
    options.headers['content-type'] = 'multipart/related;boundary="frontier"';

    if (!options.multipart.forEach) throw new Error('Argument error, options.multipart.');
    options.multipart.forEach(function (part) {
      var body = part.body;
      if(!body) throw Error('Body attribute missing in multipart.');
      delete part.body;
      options.body += '--frontier\r\n'; 
      Object.keys(part).forEach(function(key){
        options.body += key + ': ' + part[key] + '\r\n'
      })
      options.body += '\r\n' + body + '\r\n';
    })
    options.body += '--frontier--'
  }

  if (options.body) {
    if (!Buffer.isBuffer(options.body)) {
      options.body = new Buffer(options.body);
    }
    if (options.body.length) {
      options.headers['content-length'] = options.body.length;
    } else {
      throw new Error('Argument error, options.body.');
    }
  }
  
  options.httpModule = 
    {"http:":http, "https:":https}[options.proxy ? options.proxy.protocol : options.uri.protocol]
  if (!options.httpModule) throw new Error("Invalid protocol");
  
  if (options.maxSockets) {
    options.agent = options.getAgent(options.host, options.port);
    options.agent.maxSockets = options.maxSockets;
  }
  if (options.pool.maxSockets) {
    options.agent = options.getAgent(options.host, options.port);
    options.agent.maxSockets = options.pool.maxSockets;
  }

  options.req = options.httpModule.request(options, function (response) {
    if (setHost) delete options.headers.host;

    if (response.statusCode >= 300 && 
        response.statusCode < 400  && 
        options.followRedirect     && 
        options.method !== 'PUT' && 
        options.method !== 'POST' &&
        response.headers.location) {
      if (options._redirectsFollowed >= options.maxRedirects) {
        options.emit('error', new Error("Exceeded maxRedirects. Probably stuck in a redirect loop."));
      }
      options._redirectsFollowed += 1;
      if (!isUrl.test(response.headers.location)) {
        response.headers.location = url.resolve(options.uri.href, response.headers.location);
      }
      options.uri = response.headers.location;
      delete options.req;
      if (options.headers) {
        delete options.headers.host;
      }
      request(options, options.callback);
      return; // Ignore the rest of the response
    } else {
      options._redirectsFollowed = 0;
      if (options.encoding) response.setEncoding(options.encoding);
      if (options.dest) {
        response.pipe(options.dest);
        if (options.onResponse) options.onResponse(null, response);
        if (options.callback) options.callback(null, response, options.responseBodyStream);
      } else {
        if (options.onResponse) {
          options.onResponse(null, response);
        }
        if (options.callback) {
          var buffer = '';
          response
          .on("data", function (chunk) { buffer += chunk; })
          .on("end", function () { options.callback(null, response, buffer); })
          ;
        }
      }
    }
  })
  
  options.req.on('error', clientErrorHandler);
    
  this.once('pipe', function (src) {
    options.src = src;
  })
  
  process.nextTick(function () {
    if (options.body) {
      options.req.write(options.body);
      options.req.end();
    } else if (options.requestBodyStream) {
      console.warn("options.requestBodyStream is deprecated, please pass the request object to stream.pipe.")
      options.requestBodyStream.pipe(options);
    } else if (!options.src) {
      options.req.end();
    }
  })
}

Request.prototype.write = function (chunk) {
  if (!this.req) throw new Error("This request has been piped before http.request() was called.");
  this.req.write(chunk);
}
Request.prototype.end = function () {
  this.req.end();
}



function request (options, callback) {
  if (callback) options.callback = callback;
  var r = new Request(options);
  r.request();
  return r;
}


module.exports = request;

request.defaults = function (options) {
  var def = function (method) {
    var d = function (opts, callback) {
      for (i in options) {
        if (!opts[i]) opts[i] = options[i];
        return method(opts, callback);
      }
    }
    return d;
  }
  de = def(request);
  de.get = def(request.get);
  de.post = def(request.post);
  de.put = def(request.put);
  de.head = def(request.head);
  return d;
}

request.get = request;
request.post = function (options, callback) {
  options.method = 'POST'; 
  if (!options.body && !options.requestBodyStream && !options.json && !options.multipart) {
    console.error("HTTP POST requests need a body or requestBodyStream");
  }
  request(options, callback);
};
request.put = function (options, callback) {
  options.method = 'PUT'; 
  if (!options.body && !options.requestBodyStream && !options.json && !options.multipart) {
    console.error("HTTP PUT requests need a body or requestBodyStream");
  }
  request(options, callback);
};
request.head = function (options, callback) {
  options.method = 'HEAD'; 
  if (options.body || options.requestBodyStream || options.json || options.multipart) {
    throw new Error("HTTP HEAD requests MUST NOT include a request body.");
  }
  request(options, callback);
};
