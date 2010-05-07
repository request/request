# Request -- Simplified HTTP request method

### Install

<pre>
  npm install request
</pre>

### Super simple to use

request(options, callback);

<pre>
  var request = require('request');
  request({uri:'http://www.google.com'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      sys.puts(body) // Print the google web page.
    }
  })
</pre>

### Options

The first argument is an options object. The only required option is uri, all others are optional.

uri : fully qualified uri or a parsed url object from url.parse()
method : http method, defaults to GET
headers : http headers, defaults to {}
body : entity body for POST and PUT requests
client : existing http client object (when undefined a new one will be created and assigned to this property so you can keep around a reference to it if you would like use keep-alive on later request)

### callback

The callback argument gets 3 arguments. The first is an error when applicable (usually from the http.Client option not the http.ClientRequest object). The second in an http.ClientResponse object. The third is the response body buffer.