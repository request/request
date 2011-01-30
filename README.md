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

#### request(options, callback)

The first argument is an options object. The only required option is uri, all others are optional.

* `uri` || `url` - fully qualified uri or a parsed url object from url.parse()
* `method` - http method, defaults to GET
* `headers` - http headers, defaults to {}
* `body` - entity body for POST and PUT requests. Must be buffer or string.
* `json` - sets `body` but to JSON representation of value and adds `Content-type: application/json` header.
* `multipart` - (experimental) array of objects which contains their own headers and `body` attribute. Sends `multipart/related` request. See example below.
* `client` - existing http client object (when undefined a new one will be created and assigned to this property so you can keep around a reference to it if you would like use keep-alive on later request)
* `followRedirect` - follow HTTP 3xx responses as redirects. defaults to true.
* `maxRedirects` - the maximum number of redirects to follow, defaults to 10.
* `onResponse` - If true the callback will be fired on the "response" event instead of "end". If a function it will be called on "response" and not effect the regular semantics of the main callback on "end".
* `encoding` - Encoding to be used on response.setEncoding when buffering the response data.
* `requestBodyStream` - Stream to read request body chunks from. 
* `responseBodyStream` - Stream to write body chunks to. When set this option will be passed as the last argument to the callback instead of the entire body.

The callback argument gets 3 arguments. The first is an error when applicable (usually from the http.Client option not the http.ClientRequest object). The second in an http.ClientResponse object. The third is the response body buffer.

Examples:
<pre>
  var request = require('request');
  request({uri:'http://www.google.com'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      sys.puts(body) // Print the google web page.
    }
  })
</pre>

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

It's also worth noting that the options argument will mutate. When following a redirect the uri values will change. After setting up client options it will set options.client.
