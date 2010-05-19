# Request -- Simplified HTTP request method

## Install

<pre>
  npm install request
</pre>

## Super simple to use

Request is designed to be the simplest way possible to make http calls. It support HTTPS and follows redirects by default.

#### request(options, callback)

The first argument is an options object. The only required option is uri, all others are optional.

* `'uri'` - fully qualified uri or a parsed url object from url.parse()
* `'method'` - http method, defaults to GET
* `'headers'` - http headers, defaults to {}
* `'body'` - entity body for POST and PUT requests
* `'client'` - existing http client object (when undefined a new one will be created and assigned to this property so you can keep around a reference to it if you would like use keep-alive on later request)
* '`followRedirect` - follow HTTP 3xx responses as redirects. defaults to true.

The callback argument gets 3 arguments. The first is an error when applicable (usually from the http.Client option not the http.ClientRequest object). The second in an http.ClientResponse object. The third is the response body buffer.

Example:
<pre>
  var request = require('request');
  request({uri:'http://www.google.com'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      sys.puts(body) // Print the google web page.
    }
  })
</pre>

It's also worth noting that the options argument will mutate. When following a redirect the uri values will change. After setting up a client options it will set the client property.