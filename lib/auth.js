'use strict'

var caseless = require('caseless')
var uuid = require('uuid')
var helpers = require('./helpers')

var md5 = helpers.md5
var toBase64 = helpers.toBase64


function Auth (request) {
  // define all public properties here
  this.request = request
  this.hasAuth = false
  this.sentAuth = false
  this.bearerToken = null
  this.user = null
  this.pass = null
  this.disable = null
}

Auth.prevDigestAuthValue = {}

Auth.prototype.isPrevDigestAuthValid = function(hostname) {
  return (Auth.prevDigestAuthValue[hostname] !== undefined)
}

Auth.prototype.getPrevDigestAuth = function(hostname) {
  return Auth.prevDigestAuthValue[hostname]
}

Auth.prototype.resetPrevDigestAuth = function(hostname) {
  delete Auth.prevDigestAuthValue[hostname]
}

Auth.prototype.updatePrevDigestAuth = function(hostname, value) {
  Auth.prevDigestAuthValue[hostname] = value

}

Auth.prototype.isEnabled = function(authMethod) {
  var self = this
  return !(self.disable && self.disable[authMethod])
}

Auth.prototype.basic = function (user, pass, sendImmediately) {
  var self = this
  if (typeof user !== 'string' || (pass !== undefined && typeof pass !== 'string')) {
    self.request.emit('error', new Error('auth() received invalid user or password'))
  }
  self.user = user
  self.pass = pass
  self.hasAuth = true
  var header = user + ':' + (pass || '')
  if (sendImmediately || typeof sendImmediately === 'undefined') {
    var authHeader = 'Basic ' + toBase64(header)
    self.sentAuth = true
    return authHeader
  }
}

Auth.prototype.bearer = function (bearer, sendImmediately) {
  var self = this
  self.bearerToken = bearer
  self.hasAuth = true
  if (sendImmediately || typeof sendImmediately === 'undefined') {
    if (typeof bearer === 'function') {
      bearer = bearer()
    }
    var authHeader = 'Bearer ' + (bearer || '')
    self.sentAuth = true
    return authHeader
  }
}

Auth.prototype.digest = function (user, pass, method, path, hostname, authHeader) {
  // TODO: More complete implementation of RFC 2617.
  //   - handle challenge.domain
  //   - support qop="auth-int" only
  //   - handle Authentication-Info (not necessarily?)
  //   - check challenge.stale (not necessarily?)
  //   - increase nc (not necessarily?)
  // For reference:
  // http://tools.ietf.org/html/rfc2617#section-3
  // https://github.com/bagder/curl/blob/master/lib/http_digest.c

  var self = this

  self.user = user
  self.pass = pass
  self.hasAuth = true

  var challenge = {}
  if (self.isPrevDigestAuthValid(hostname)) {
    challenge = self.getPrevDigestAuth(hostname)
  } else {
    var re = /([a-z0-9_-]+)=(?:"([^"]+)"|([a-z0-9_-]+))/gi
    for (;;) {
      var match = re.exec(authHeader)
      if (!match) {
        break
      }
      challenge[match[1]] = match[2] || match[3]
    }
  }

  /**
   * RFC 2617: handle both MD5 and MD5-sess algorithms.
   *
   * If the algorithm directive's value is "MD5" or unspecified, then HA1 is
   *   HA1=MD5(username:realm:password)
   * If the algorithm directive's value is "MD5-sess", then HA1 is
   *   HA1=MD5(MD5(username:realm:password):nonce:cnonce)
   */
  var ha1Compute = function (algorithm, user, realm, pass, nonce, cnonce) {
    var ha1 = md5(user + ':' + realm + ':' + pass)
    if (algorithm && algorithm.toLowerCase() === 'md5-sess') {
      return md5(ha1 + ':' + nonce + ':' + cnonce)
    } else {
      return ha1
    }
  }

  var qop = /(^|,)\s*auth\s*($|,)/.test(challenge.qop) && 'auth'
  var nc
  if (self.isPrevDigestAuthValid()) {
    nc = (parseInt(Auth.prevDigestAuthValue.nc) + 1) + ''
    while (nc.length < 8) {
      nc = '0' + nc
    }
  } else {
    nc = qop && '00000001'
  }
  var cnonce = qop && uuid().replace(/-/g, '')
  var ha1 = ha1Compute(challenge.algorithm, self.user, challenge.realm, self.pass, challenge.nonce, cnonce)
  var ha2 = md5(method + ':' + path)
  var digestResponse = qop
    ? md5(ha1 + ':' + challenge.nonce + ':' + nc + ':' + cnonce + ':' + qop + ':' + ha2)
    : md5(ha1 + ':' + challenge.nonce + ':' + ha2)
  var authValues = {
    username: self.user,
    realm: challenge.realm,
    nonce: challenge.nonce,
    uri: path,
    qop: qop,
    response: digestResponse,
    nc: nc,
    cnonce: cnonce,
    algorithm: challenge.algorithm,
    opaque: challenge.opaque
  }

  self.updatePrevDigestAuth(hostname, authValues)

  authHeader = []
  for (var k in authValues) {
    if (authValues[k]) {
      if (k === 'qop' || k === 'nc' || k === 'algorithm') {
        authHeader.push(k + '=' + authValues[k])
      } else {
        authHeader.push(k + '="' + authValues[k] + '"')
      }
    }
  }
  authHeader = 'Digest ' + authHeader.join(', ')
  self.sentAuth = !self.isPrevDigestAuthValid(hostname)
  return authHeader
}

Auth.prototype.onRequest = function (user, pass, sendImmediately, bearer, disable) {
  var self = this
  var request = self.request
  self.disable = disable

  if (sendImmediately === undefined) {
    sendImmediately = true
  }
  var authHeader
  if (bearer === undefined && user === undefined) {
    self.request.emit('error', new Error('no auth mechanism defined'))
  } else if (bearer !== undefined) {
    authHeader = self.bearer(bearer, sendImmediately)
  } else if (!sendImmediately && self.isPrevDigestAuthValid(request.uri.hostname)) {
    authHeader = self.digest(user, pass, request.method, request.uri.href, request.uri.hostname, null)
  } else {
    authHeader = self.basic(user, pass, sendImmediately)
  }
  if (authHeader) {
    request.setHeader('authorization', authHeader)
  } 
}

Auth.prototype.onResponse = function (response) {
  var self = this
  var request = self.request

  if (!self.hasAuth || self.sentAuth) { return null }

  var c = caseless(response.headers)

  var authHeader = c.get('www-authenticate')
  var authVerb = authHeader && authHeader.split(' ')[0].toLowerCase()
  request.debug('reauth', authVerb)

  switch (authVerb) { 
    case 'basic':  
      if (self.isEnabled('basic')) {
        return self.basic(self.user, self.pass, true)
      } else {
        self.request.emit('error', new Error('server requested Basic authentication'))
      }
      break

    case 'bearer':
      if (self.isEnabled('bearer')) {
        return self.bearer(self.bearerToken, true)
      } else {
        self.request.emit('error', new Error('server requested Bearer authentication'))
      }
      break

    case 'digest':
      if (self.isEnabled('digest')) {
        self.resetPrevDigestAuth(request.uri.hostname)
        return self.digest(self.user, self.pass, request.method, request.path, request.uri.hostname, authHeader)
      } else {
        self.request.emit('error', new Error('server requested Digest Authentication'))
      }
      break    
  }
}

exports.Auth = Auth
