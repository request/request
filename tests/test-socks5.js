// Test that we can tunnel http and https request over a socks proxy.
//
// Note: this requires that a socks server is running on port 1080.
// If the connection fails, we'll just log a warning.

var request = require('../index')
  , socks5 = {socksHost: 'localhost', socksPort: 1080}
  , hadError = null

request({ uri: 'https://encrypted.google.com/'
      , socks5: socks5
      , strictSSL: true
      , json: true }, function (er, body) {
  hadError = er
  console.log(er || typeof body)
  if (!er) console.log("https ok")
});

request({ uri: 'http://www.example.com/'
  , socks5: socks5 }, function (er, body) {
  hadError = er
  console.log(er || typeof body)
  if (!er) console.log("http ok")
});
