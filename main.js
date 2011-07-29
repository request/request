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
  , https = false
  , tls = false
  , url = require('url')
  , util = require('util')
  , stream = require('stream')
  , qs = require('querystring')
  , mimetypes = require('./mimetypes')
  ;

try {
    https = require('https');
} catch (e) {}

try {
    tls = require('tls');
} catch (e) {}

var toBase64 = function(str) {
  return (new Buffer(str || "", "ascii")).toString("base64");
};

// Hacky fix for pre-0.4.4 https
if (https && !https.Agent) {
  https.Agent = function (options) {
    http.Agent.call(this, options);
  }
  util.inherits(https.Agent, http.Agent);

  https.Agent.prototype._getConnection = function(host, port, cb) {
    var s = tls.connect(port, host, this.options, function() {
      // do other checks here?
      if (cb) cb();
    });

    return s;
  };
}

var isReadStream = function (rs) {
  if (rs.readable && rs.path && rs.mode) {
    return true;  
  }
}

var isUrl = /^https?:/;

var globalPool = {};

var Request = function (options) {
  stream.Stream.call(this);
  this.readable = true;
  this.writable = true;
  
  if (typeof options === 'string') {
    options = {uri:options};
  }
  
  for (i in options) {
    this[i] = options[i];
  }
  if (!this.pool) this.pool = globalPool;
  this.dests = [];
  this.__isRequestRequest = true;
}
util.inherits(Request, stream.Stream);
Request.prototype.getAgent = function (host, port) {
  if (!this.pool[host+':'+port]) {
    this.pool[host+':'+port] = new this.httpModule.Agent({host:host, port:port});
  }
  return this.pool[host+':'+port];
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
  } else {
    options.port = options.uri.port;
    options.host = options.uri.hostname;
  }
  
  if (options.onResponse === true) {
    options.onResponse = options.callback;
    delete options.callback;
  }
  
  var clientErrorHandler = function (error) {
    if (setHost) delete options.headers.host;
    options.emit('error', error);
  };
  if (options.onResponse) options.on('error', function (e) {options.onResponse(e)}); 
  if (options.callback) options.on('error', function (e) {options.callback(e)});
  

  if (options.uri.auth && !options.headers.authorization) {
    options.headers.authorization = "Basic " + toBase64(options.uri.auth.split(':').map(function(item){ return qs.unescape(item)}).join(':'));
  }
  if (options.proxy && options.proxy.auth && !options.headers['proxy-authorization']) {
    options.headers.authorization = "Basic " + toBase64(options.uri.auth.split(':').map(function(item){ return qs.unescape(item)}).join(':'));
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
  
  if (options.pool === false) {
    options.agent = false;
  } else {
    if (options.maxSockets) {
      // Don't use our pooling if node has the refactored client
      options.agent = options.httpModule.globalAgent || options.getAgent(options.host, options.port);
      options.agent.maxSockets = options.maxSockets;
    }
    if (options.pool.maxSockets) {
      // Don't use our pooling if node has the refactored client
      options.agent = options.httpModule.globalAgent || options.getAgent(options.host, options.port);
      options.agent.maxSockets = options.pool.maxSockets;
    }
  }
  
  options.start = function () {
    options._started = true;
    
    options.method = options.method || 'GET';
    
    options.req = options.httpModule.request(options, function (response) {
      options.response = response;
      response.request = options;
      if (setHost) delete options.headers.host;
      if (options.timeout && options.timeoutTimer) clearTimeout(options.timeoutTimer);

      if (response.statusCode >= 300 && 
          response.statusCode < 400  && 
          options.followRedirect     && 
          options.method !== 'PUT' && 
          options.method !== 'POST' &&
          response.headers.location) {
        if (options._redirectsFollowed >= options.maxRedirects) {
          options.emit('error', new Error("Exceeded maxRedirects. Probably stuck in a redirect loop."));
          return;
        }
        options._redirectsFollowed += 1;
        if (!isUrl.test(response.headers.location)) {
          response.headers.location = url.resolve(options.uri.href, response.headers.location);
        }
        options.uri = response.headers.location;
        delete options.req;
        delete options.agent;
        delete options._started;
        if (options.headers) {
          delete options.headers.host;
        }
        request(options, options.callback);
        return; // Ignore the rest of the response
      } else {
        options._redirectsFollowed = 0;
        // Be a good stream and emit end when the response is finished.
        // Hack to emit end on close because of a core bug that never fires end
        response.on('close', function () {options.response.emit('end')})

        if (options.encoding) {
          if (options.dests.length !== 0) {
            console.error("Ingoring encoding parameter as this stream is being piped to another stream which makes the encoding option invalid.");
          } else {
            response.setEncoding(options.encoding);
          }
        }

        options.dests.forEach(function (dest) {
          if (dest.headers) {
            dest.headers['content-type'] = response.headers['content-type'];
            if (response.headers['content-length']) {
              dest.headers['content-length'] = response.headers['content-length'];
            }
          } 
          if (dest.setHeader) {
            for (i in response.headers) {
              dest.setHeader(i, response.headers[i])
            }
            dest.statusCode = response.statusCode;
          }
        })

        response.on("data", function (chunk) {options.emit("data", chunk)});
        response.on("end", function (chunk) {options.emit("end", chunk)});
        response.on("close", function () {options.emit("close")});

        if (options.onResponse) {
          options.onResponse(null, response);
        }
        if (options.callback) {
          var buffer = '';
          options.on("data", function (chunk) { 
            buffer += chunk; 
          })
          options.on("end", function () { 
            response.body = buffer;
            options.callback(null, response, buffer); 
          })
          ;
        }
      }
    })

    if (options.timeout) {
      options.timeoutTimer = setTimeout(function() {
          options.req.abort();
          options.emit("error", "ETIMEDOUT");
      }, options.timeout);
    }

    options.req.on('error', clientErrorHandler);
  }  
    
  options.once('pipe', function (src) {
    if (options.ntick) throw new Error("You cannot pipe to this stream after the first nextTick() after creation of the request stream.")
    options.src = src;
    if (isReadStream(src)) {
      options.headers['content-type'] = mimetypes.lookup(src.path.slice(src.path.lastIndexOf('.')+1))
    } else {
      if (src.headers) {
        for (i in src.headers) {
          if (!options.headers[i]) {
            options.headers[i] = src.headers[i]
          }
        }
      }
      if (src.method && !options.method) {
        options.method = src.method;
      }
    }
    
    options.on('pipe', function () {
      console.error("You have already piped to this stream. Pipeing twice is likely to break the request.")
    })
  })
  
  process.nextTick(function () {
    if (options.body) {
      options.write(options.body);
      options.end();
    } else if (options.requestBodyStream) {
      console.warn("options.requestBodyStream is deprecated, please pass the request object to stream.pipe.")
      options.requestBodyStream.pipe(options);
    } else if (!options.src) {
      options.end();
    }
    options.ntick = true;
  })
}
Request.prototype.pipe = function (dest) {
  if (this.response) throw new Error("You cannot pipe after the response event.")
  this.dests.push(dest);
  stream.Stream.prototype.pipe.call(this, dest)
  return dest
}
Request.prototype.write = function () {
  if (!this._started) this.start();
  if (!this.req) throw new Error("This request has been piped before http.request() was called.");
  this.req.write.apply(this.req, arguments);
}
Request.prototype.end = function () {
  if (!this._started) this.start();
  if (!this.req) throw new Error("This request has been piped before http.request() was called.");
  this.req.end.apply(this.req, arguments);
}
Request.prototype.pause = function () {
  if (!this.response) throw new Error("This request has been piped before http.request() was called.");
  this.response.pause.apply(this.response, arguments);
}
Request.prototype.resume = function () {
  if (!this.response) throw new Error("This request has been piped before http.request() was called.");
  this.response.resume.apply(this.response, arguments);
}

function request (options, callback) {
  if (typeof options === 'string') options = {uri:options};
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
        if (opts[i] === undefined) opts[i] = options[i];
      }
      return method(opts, callback);
    }
    return d;
  }
  de = def(request);
  de.get = def(request.get);
  de.post = def(request.post);
  de.put = def(request.put);
  de.head = def(request.head);
  de.del = def(request.del);
  return de;
}

request.get = request;
request.post = function (options, callback) {
  if (typeof options === 'string') options = {uri:options};
  options.method = 'POST';
  return request(options, callback);
};
request.put = function (options, callback) {
  if (typeof options === 'string') options = {uri:options};
  options.method = 'PUT';
  return request(options, callback);
};
request.head = function (options, callback) {
  if (typeof options === 'string') options = {uri:options};
  options.method = 'HEAD';
  if (options.body || options.requestBodyStream || options.json || options.multipart) {
    throw new Error("HTTP HEAD requests MUST NOT include a request body.");
  }
  return request(options, callback);
};
request.del = function (options, callback) {
  if (typeof options === 'string') options = {uri:options};
  options.method = 'DELETE';
  return request(options, callback);
}
