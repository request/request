
# Authentication

## OAuth

### OAuth1.0 Refresh Token

- http://oauth.googlecode.com/svn/spec/ext/session/1.0/drafts/1/spec.html#anchor4
- https://developer.yahoo.com/oauth/guide/oauth-refreshaccesstoken.html

```js
request.post('https://api.login.yahoo.com/oauth/v2/get_token', {
  oauth: {
    consumer_key: '...',
    consumer_secret: '...',
    token: '...',
    token_secret: '...',
    session_handle: '...'
  }
}, function (err, res, body) {
  var result = require('querystring').parse(body)
  // assert.equal(typeof result, 'object')
})
```

### OAuth2 Refresh Token

- https://tools.ietf.org/html/draft-ietf-oauth-v2-31#section-6

```js
request.post('https://accounts.google.com/o/oauth2/token', {
  form: {
    grant_type: 'refresh_token',
    client_id: '...',
    client_secret: '...',
    refresh_token: '...'
  },
  json: true
}, function (err, res, body) {
  // assert.equal(typeof body, 'object')
})
```

# Multipart

## multipart/form-data

### Flickr Image Upload

- https://www.flickr.com/services/api/upload.api.html

```js
request.post('https://up.flickr.com/services/upload', {
  oauth: {
    consumer_key: '...',
    consumer_secret: '...',
    token: '...',
    token_secret: '...'
  },
  // all meta data should be included here for proper signing
  qs: {
    title: 'My cat is awesome',
    description: 'Sent on ' + new Date(),
    is_public: 1
  },
  // again the same meta data + the actual photo
  formData: {
    title: 'My cat is awesome',
    description: 'Sent on ' + new Date(),
    is_public: 1,
    photo:fs.createReadStream('cat.png')
  },
  json: true
}, function (err, res, body) {
  // assert.equal(typeof body, 'object')
})
```

# Streams

## `POST` data

Use Request as a Writable stream to easily `POST` Readable streams (like files, other HTTP requests, or otherwise).

TL;DR: Pipe a Readable Stream onto Request via:

```
READABLE.pipe(request.post(URL));
```

A more detailed example:

```js
var fs = require('fs')
  , path = require('path')
  , http = require('http')
  , request = require('request')
  , TMP_FILE_PATH = path.join(path.sep, 'tmp', 'foo')
;

// write a temporary file:
fs.writeFileSync(TMP_FILE_PATH, 'foo bar baz quk\n');

http.createServer(function(req, res) {
  console.log('the server is receiving data!\n');
  req
    .on('end', res.end.bind(res))
    .pipe(process.stdout)
  ;
}).listen(3000).unref();

fs.createReadStream(TMP_FILE_PATH)
  .pipe(request.post('http://127.0.0.1:3000'))
;
```

## Responses: `statusCode`, `headers`, et. al

When streaming with Request, listen for the "response" event in order to handle `statusCode`s and `headers`.

TL;DR: A Request stream emits a "response" event, which provides the `res` argument you may be familiar with, having used `http.createServer` or Express:

```
request('http://example.com')
  .on('response', function(res) {
    console.log('status code:', res.statusCode);
    console.log('headers:', res.headers);
  })
;
```

A more detailed example rejecting any responses that are not `200`s:

```js
var http = require('http')
  , url = require('url')
  , querystring = require('querystring')
  , request = require('request')
;

http.createServer(function(req, res) {
  req.params = querystring.parse(url.parse(req.url).search.replace('?', ''));

  var handleError = function(err) {
    res.statusCode = 500;
    res.end(err.toString());
  }
  request(req.params.url)
    .on('response', function(response) {
      if (response.statusCode !== 200) {
        this.abort(); // aborts the request!
        handleError(new Error('something went wrong\n'));
      }
        
    })
    .pipe(res)
  ;
}).listen(3000).unref();

http.createServer(function(req, res) {
  res.end('ok!\n')
}).listen(3001).unref();

http.createServer(function(req, res) {
  res.statusCode = 500;
  res.end('not ok :(\n');
}).listen(3002).unref();


request({ uri: 'http://localhost:3000', qs: { url: 'http://localhost:3001' } })
  .pipe(process.stdout)
;

request({ uri: 'http://localhost:3000', qs: { url: 'http://localhost:3002' } })
  .pipe(process.stdout)
;
```

## Responses: `contentType`s

It's possible to use Request as a Stream, and determine what you'd like to do with it after the "response" event occurs.

Consider the following example where we may want to save the file extension of a bunch of images, but sometimes the images do not explicitly have extensions.

```js
var http = require('http')
  , fs = require('fs')
  , path = require('path')
  , mime = require('mime')
  , request = require('request')
  , REQUEST_LOGO = new Buffer('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', 'base64')
;

http.createServer(function(req, res) {
  res.setHeader('content-type', 'image/png');
  res.end(REQUEST_LOGO);
}).listen(3000).unref();

request('http://localhost:3000/image-with-no-extension')
  .on('response', function(response) {
    var ext = mime.extension(response.headers['content-type']);
    var tmpPath = path.join(path.sep, 'tmp', 'request-logo.' + ext);
    response.pipe(fs.createWriteStream(tmpPath));
  })
;
```
