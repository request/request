var exec = require('child_process').exec
  , path = require('path')
  , request = require('../')
  , tape = require('tape')

// NOTE: The target server and the KDC are set up
//       in a docker container. See the Dockerfile 
//       and tests/kerberos/start.sh for more info. 

tape('should be able to handle 401 when auth is not specified', function (t) {
  request({
    uri: 'http://localhost:8000/whoami',
    method: 'GET'
  }, function (err, res, body) {
    if (err) {
      t.end('Failed to nicely deal with 401 from a kerberized service')
    } else {
      t.equal(res.statusCode, 401)
      t.equal(body, 'Unauthorized')
      t.end()  
    }
  })
})

tape('obtain a TGT for bob@TESTBED.COM', function(t) {
  var passFile = path.join(__dirname, 'kerberos/bob-pass')
  exec('/usr/bin/kinit --password-file=' + passFile + ' bob', function(err, stdout, stderr) {
    if (err) {
      t.end('Could not obtain a TGT: ' + err)
    } else {
      t.end()
    }
  })
})

tape('should perform kerberos handshake when a TGT is available', function (t) {
  request({
    uri: 'http://localhost:8000/whoami',
    method: 'GET',
    auth: {
      negotiate: true
    }
  }, function (err, res, body) {
    if (err) {
      t.end('Failed to perform kerberized request: ' + err)
    } else {
      t.equal(body, 'bob@TESTBED.COM')
      t.end()
    }
  })
})

tape('clear the cache', function(t) {
  exec('/usr/bin/kdestroy', function(err, stdout, stderr) {
    if (err) {
      t.end('Could not clear the cache: ' + err)
    } else {
      t.end()
    }
  })
})

tape('should return an error when the cache is empty', function (t) {
  request({
    uri: 'http://localhost:8000/whoami',
    method: 'GET',
    auth: {
      negotiate: true
    }
  }, function (err, res, body) {
    if (!err) {
      t.end('Expected a kerberos error')
    } else {
      t.ok(err.message.match(/No Kerberos/))
      t.end()
    }
  })
})