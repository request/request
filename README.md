# Request -- Simplified HTTP request method

## Install

<pre>
  npm install request
</pre>

Or from source:

<pre>
  git clone git://github.com/mikeal/request.git 
  cd request
  npm link .
</pre>

## Super simple to use

Request is designed to be the simplest way possible to make http calls. It support HTTPS and follows redirects by default.

<pre>
  var request = require('request');
  request({uri:'http://www.google.com'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      sys.puts(body) // Print the google web page.
    }
  })
</pre>

#### request(options, callback)

The first argument is an options object. The only required option is uri, all others are optional.

* `uri` || `url` - fully qualified uri or a parsed url object from url.parse()
* `method` - http method, defaults to GET
* `headers` - http headers, defaults to {}
* `body` - entity body for POST and PUT requests. Must be buffer or string.
* `json` - sets `body` but to JSON representation of value and adds `Content-type: application/json` header.
* `multipart` - (experimental) array of objects which contains their own headers and `body` attribute. Sends `multipart/related` request. See example below.
* `followRedirect` - follow HTTP 3xx responses as redirects. defaults to true.
* `maxRedirects` - the maximum number of redirects to follow, defaults to 10.
* `onResponse` - If true the callback will be fired on the "response" event instead of "end". If a function it will be called on "response" and not effect the regular semantics of the main callback on "end".
* `encoding` - Encoding to be used on response.setEncoding when buffering the response data.
* `pool` - A hash object containing the agents for these requests. If omitted this request will use the global pool which is set to node's default maxSockets.
* `pool.maxSockets` - Integer containing the maximum amount of sockets in the pool.
* `timeout` - Integer containing the number of milliseconds to wait for a request to respond before aborting the request	

The callback argument gets 3 arguments. The first is an error when applicable (usually from the http.Client option not the http.ClientRequest object). The second in an http.ClientResponse object. The third is the response body buffer.

Examples:

<pre>
  var request = require('request');
  var rand = Math.floor(Math.random()*100000000).toString();
  request(
    { method: 'PUT'
    , uri: 'http://mikeal.couchone.com/testjs/' + rand
    , multipart: 
      [ { 'content-type': 'application/json'
        ,  body: JSON.stringify({foo: 'bar', _attachments: {'message.txt': {follows: true, length: 18, 'content_type': 'text/plain' }}})
        }
      , { body: 'I am an attachment' }
      ] 
    }
  , function (error, response, body) {
      if(response.statusCode == 201){
        console.log('document saved as: http://mikeal.couchone.com/testjs/'+ rand);
      } else {
        console.log('error: '+ response.statusCode);
        console.log(body);
      }
    }
  )
</pre>

**Notice for 2.0**

You should no longer recycle mutations in the options object. Because node 0.4.0 has an internal pooling mechanism the preferred way of sharing a connection is using agents which request simplifies with it's new pool API. Therefor options.client and some other mutations have been deprecated.

requestBodyStream and responseBodyStream are also deprecated in favor of a more standard pipe interface documented below.

### stream.pipe(request(options)) and request(options).pipe(stream)

Previous versions of request had no return value and only accepted callbacks and streams for pumping in the options object.

Node has solidified it's Stream interface and request 2.0 is now compliant with that interface.

The return value of request() is now a Request object, which is a valid stream.

As a writable stream it accepts the body of an HTTP request. As a readable stream it emits the data events for the response.

<pre>
  var r = request(
    { url: "http://mysite.com/image.png"
    , method: 'PUT'
    , headers: {'content-type': 'image/png'}
    }
  )
  fs.createReadStream('image.png').pipe(r)
  r.pipe(fs.createWriteStream('pushlog.txt'))
</pre>  
  
# Convenience methods

### request.defaults(options)  
  
This method returns a wrapper around the normal request API that defaults to whatever options you pass in to it.

### request.put

Same as request() but defaults to `method: "PUT"`.

### request.post

Same as request() but defaults to `method: "POST"`.

### request.head

Same as request() but defaults to `method: "HEAD"`.

### request.get

Alias to normal request method for uniformity.
