
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
      if (response.statusCode !== 200)
        handleError(new Error('something went wrong\n'))
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


request('http://localhost:3000?url=' + encodeURIComponent('http://localhost:3001'))
  .pipe(process.stdout)
;

request('http://localhost:3000?url=' + encodeURIComponent('http://localhost:3002'))
  .pipe(process.stdout)
;
```
