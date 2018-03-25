
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

# Proxys

Run tor on the terminal and try the following. (Needs `socks5-http-client` to connect to tor)

```js
var request = require('../index.js');
var Agent = require('socks5-http-client/lib/Agent');

request.get({
    url: 'http://www.tenreads.io',
    agentClass: Agent,
    agentOptions: {
        socksHost: 'localhost', // Defaults to 'localhost'.
        socksPort: 9050 // Defaults to 1080.
    }
}, function (err, res) {
    console.log(res.body); 
});
```
# Tor

How
Tor communicates through the SOCKS Protocol so we need to create and configure appropriate SOCKS Agent objects for Node's http and https core libraries using the socks library.

Installation
from npm

npm install tor-request
from source

git clone https://github.com/talmobi/tor-request
cd tor-request
npm install
Requirements
A Tor client.

Either run it yourself locally (recommended) or specify the address for a publically available one.

Tor is available for a multitude of systems.

On Debian you can install and run a relatively up to date Tor with.

apt-get install tor # should auto run as daemon after install 
On OSX you can install with homebrew

brew install tor
tor & # run as background process 
On Windows download the tor expert bundle (not the browser), unzip it and run tor.exe.

./Tor/tor.exe # --default-torrc PATH_TO_TORRC 
See TorProject.org for detailed installation guides for all platforms.

The Tor client by default runs on port 9050 (localhost of course). This is also the default address tor-request uses. You can change it if needed.

tr.setTorAddress(ipaddress, port); // "localhost" and 9050 by default
(Optional) Configuring Tor, enabling the ControlPort
You need to enable the Tor ControlPort if you want to programmatically refresh the Tor session (i.e., get a new proxy IP address) without restarting your Tor client.

Configure tor by editing the torrc file usually located at /etc/tor/torrc, /lib/etc/tor/torrc, ~/.torrc or /usr/local/etc/tor/torrc - Alternatively you can supply the path yourself with the --default-torrc PATH command line argument. See Tor Command-Line Options

Generate the hash password for the torrc file by running tor --hash-password SECRETPASSWORD.

tor --hash-password giraffe
The last line of the output contains the hash password that you copy paste into torrc

Jul 21 13:08:50.363 [notice] Tor v0.2.6.10 (git-58c51dc6087b0936) running on Darwin with Libevent 2.0.22-stable, OpenSSL 1.0.2h and Zlib 1.2.5.
Jul 21 13:08:50.363 [notice] Tor can't help you if you use it wrong! Learn how to be safe at https://www.torproject.org/download/download#warning
16:AEBC98A6777A318660659EC88648EF43EDACF4C20D564B20FF244E81DF
Copy the generated hash password and add it to your torrc file

# sample torrc file 
ControlPort 9051
HashedControlPassword 16:AEBC98A6777A318660659EC88648EF43EDACF4C20D564B20FF244E81DF
Lastly tell tor-request the password to use

var tr = require('tor-request')
tr.TorControlPort.password = 'giraffe'
