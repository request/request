var hmacsign = require('oauth-sign').hmacsign
  , qs = require('querystring')
  , request = require('../index')
  , tape = require('tape')

function getSignature(r) {
  var sign
  r.headers.Authorization.slice('OAuth '.length).replace(/,\ /g, ',').split(',').forEach(function(v) {
    if (v.slice(0, 'oauth_signature="'.length) === 'oauth_signature="') {
      sign = v.slice('oauth_signature="'.length, -1)
    }
  })
  return decodeURIComponent(sign)
}

// Tests from Twitter documentation https://dev.twitter.com/docs/auth/oauth

var reqsign
  , accsign
  , upsign

tape('reqsign', function(t) {
  reqsign = hmacsign('POST', 'https://api.twitter.com/oauth/request_token',
    { oauth_callback: 'http://localhost:3005/the_dance/process_callback?service_provider_id=11'
    , oauth_consumer_key: 'GDdmIQH6jhtmLUypg82g'
    , oauth_nonce: 'QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk'
    , oauth_signature_method: 'HMAC-SHA1'
    , oauth_timestamp: '1272323042'
    , oauth_version: '1.0'
    }, "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98")

  t.equal(reqsign, '8wUi7m5HFQy76nowoCThusfgB+Q=')
  t.end()
})

tape('accsign', function(t) {
  accsign = hmacsign('POST', 'https://api.twitter.com/oauth/access_token',
    { oauth_consumer_key: 'GDdmIQH6jhtmLUypg82g'
    , oauth_nonce: '9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8'
    , oauth_signature_method: 'HMAC-SHA1'
    , oauth_token: '8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc'
    , oauth_timestamp: '1272323047'
    , oauth_verifier: 'pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY'
    , oauth_version: '1.0'
    }, "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98", "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA")

  t.equal(accsign, 'PUw/dHA4fnlJYM6RhXk5IU/0fCc=')
  t.end()
})

tape('upsign', function(t) {
  upsign = hmacsign('POST', 'http://api.twitter.com/1/statuses/update.json',
    { oauth_consumer_key: "GDdmIQH6jhtmLUypg82g"
    , oauth_nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y"
    , oauth_signature_method: "HMAC-SHA1"
    , oauth_token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw"
    , oauth_timestamp: "1272325550"
    , oauth_version: "1.0"
    , status: 'setting up my twitter 私のさえずりを設定する'
    }, "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98", "J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA")

  t.equal(upsign, 'yOahq5m0YjDDjfjxHaXEsW9D+X0=')
  t.end()
})

tape('rsign', function(t) {
  var rsign = request.post(
    { url: 'https://api.twitter.com/oauth/request_token'
    , oauth:
      { callback: 'http://localhost:3005/the_dance/process_callback?service_provider_id=11'
      , consumer_key: 'GDdmIQH6jhtmLUypg82g'
      , nonce: 'QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk'
      , timestamp: '1272323042'
      , version: '1.0'
      , consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
      }
    })

  process.nextTick(function() {
    t.equal(reqsign, getSignature(rsign))
    t.end()
  })
})

tape('raccsign', function(t) {
  var raccsign = request.post(
    { url: 'https://api.twitter.com/oauth/access_token'
    , oauth:
      { consumer_key: 'GDdmIQH6jhtmLUypg82g'
      , nonce: '9zWH6qe0qG7Lc1telCn7FhUbLyVdjEaL3MO5uHxn8'
      , signature_method: 'HMAC-SHA1'
      , token: '8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc'
      , timestamp: '1272323047'
      , verifier: 'pDNg57prOHapMbhv25RNf75lVRd6JDsni1AJJIDYoTY'
      , version: '1.0'
      , consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
      , token_secret: "x6qpRnlEmW9JbQn4PQVVeVG8ZLPEx6A0TOebgwcuA"
      }
    })

  process.nextTick(function() {
    t.equal(accsign, getSignature(raccsign))
    t.end()
  })
})

tape('rupsign', function(t) {
  var rupsign = request.post(
    { url: 'http://api.twitter.com/1/statuses/update.json'
    , oauth:
      { consumer_key: "GDdmIQH6jhtmLUypg82g"
      , nonce: "oElnnMTQIZvqvlfXM56aBLAf5noGD0AQR3Fmi7Q6Y"
      , signature_method: "HMAC-SHA1"
      , token: "819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw"
      , timestamp: "1272325550"
      , version: "1.0"
      , consumer_secret: "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
      , token_secret: "J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA"
      }
    , form: {status: 'setting up my twitter 私のさえずりを設定する'}
    })
  process.nextTick(function() {
    t.equal(upsign, getSignature(rupsign))
    t.end()
  })
})

tape('rfc5849 example', function(t) {
  var rfc5849 = request.post(
    { url: 'http://example.com/request?b5=%3D%253D&a3=a&c%40=&a2=r%20b'
    , oauth:
      { consumer_key: "9djdj82h48djs9d2"
      , nonce: "7d8f3e4a"
      , signature_method: "HMAC-SHA1"
      , token: "kkk9d7dh3k39sjv7"
      , timestamp: "137131201"
      , consumer_secret: "j49sk3j29djd"
      , token_secret: "dh893hdasih9"
      , realm: 'Example'
      }
    , form: {
        c2: '',
        a3: '2 q'
      }
    })

  process.nextTick(function() {
    // different signature in rfc5849 because request sets oauth_version by default
    t.equal('OB33pYjWAnf+xtOHN4Gmbdil168=', getSignature(rfc5849))
    rfc5849.abort()
    t.end()
  })
})
