'use strict'

const caseless = require('caseless')
const uuid = require('uuid/v4')
const { md5, toBase64 } = require('./helpers')

class Auth {
  constructor (request) {
    // define all public properties here
    this.request = request
    this.hasAuth = false
    this.sentAuth = false
    this.bearerToken = null
    this.user = null
    this.pass = null
  }

  basic (user, pass, sendImmediately) {
    if (
      typeof user !== 'string' ||
      (pass !== undefined && typeof pass !== 'string')
    ) {
      this.request.emit(
        'error',
        new Error('auth() received invalid user or password')
      )
    }
    this.user = user
    this.pass = pass
    this.hasAuth = true
    const header = user + ':' + (pass || '')
    if (sendImmediately || typeof sendImmediately === 'undefined') {
      const authHeader = 'Basic ' + toBase64(header)
      this.sentAuth = true
      return authHeader
    }
  }

  bearer (bearer, sendImmediately) {
    this.bearerToken = bearer
    this.hasAuth = true
    if (sendImmediately || typeof sendImmediately === 'undefined') {
      if (typeof bearer === 'function') {
        bearer = bearer()
      }
      const authHeader = 'Bearer ' + (bearer || '')
      this.sentAuth = true
      return authHeader
    }
  }

  digest (method, path, authHeader) {
    // TODO: More complete implementation of RFC 2617.
    //   - handle challenge.domain
    //   - support qop="auth-int" only
    //   - handle Authentication-Info (not necessarily?)
    //   - check challenge.stale (not necessarily?)
    //   - increase nc (not necessarily?)
    // For reference:
    // http://tools.ietf.org/html/rfc2617#section-3
    // https://github.com/bagder/curl/blob/master/lib/http_digest.c

    const challenge = {}
    const re = /([a-z0-9_-]+)=(?:"([^"]+)"|([a-z0-9_-]+))/gi
    let flag = true
    while (flag) {
      const match = re.exec(authHeader)
      if (!match) {
        flag = false
        break
      }
      challenge[match[1]] = match[2] || match[3]
    }

    /**
     * RFC 2617: handle both MD5 and MD5-sess algorithms.
     *
     * If the algorithm directive's value is "MD5" or unspecified, then HA1 is
     *   HA1=MD5(username:realm:password)
     * If the algorithm directive's value is "MD5-sess", then HA1 is
     *   HA1=MD5(MD5(username:realm:password):nonce:cnonce)
     */
    const ha1Compute = (algorithm, user, realm, pass, nonce, cnonce) => {
      const ha1 = md5(user + ':' + realm + ':' + pass)
      if (algorithm && algorithm.toLowerCase() === 'md5-sess') {
        return md5(ha1 + ':' + nonce + ':' + cnonce)
      } else {
        return ha1
      }
    }

    const qop = /(^|,)\s*auth\s*($|,)/.test(challenge.qop) && 'auth'
    const nc = qop && '00000001'
    const cnonce = qop && uuid().replace(/-/g, '')
    const ha1 = ha1Compute(
      challenge.algorithm,
      this.user,
      challenge.realm,
      this.pass,
      challenge.nonce,
      cnonce
    )
    const ha2 = md5(method + ':' + path)
    const digestResponse = qop
      ? md5(
        ha1 +
            ':' +
            challenge.nonce +
            ':' +
            nc +
            ':' +
            cnonce +
            ':' +
            qop +
            ':' +
            ha2
      )
      : md5(ha1 + ':' + challenge.nonce + ':' + ha2)
    const authValues = {
      username: this.user,
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

    authHeader = []
    for (const k in authValues) {
      if (authValues[k]) {
        if (k === 'qop' || k === 'nc' || k === 'algorithm') {
          authHeader.push(k + '=' + authValues[k])
        } else {
          authHeader.push(k + '="' + authValues[k] + '"')
        }
      }
    }
    authHeader = 'Digest ' + authHeader.join(', ')
    this.sentAuth = true
    return authHeader
  }

  onRequest (user, pass, sendImmediately, bearer) {
    const { request } = this

    let authHeader
    if (bearer === undefined && user === undefined) {
      this.request.emit('error', new Error('no auth mechanism defined'))
    } else if (bearer !== undefined) {
      authHeader = this.bearer(bearer, sendImmediately)
    } else {
      authHeader = this.basic(user, pass, sendImmediately)
    }
    if (authHeader) {
      request.setHeader('authorization', authHeader)
    }
  }

  onResponse (response) {
    const { request } = this

    if (!this.hasAuth || this.sentAuth) {
      return null
    }

    const c = caseless(response.headers)

    const authHeader = c.get('www-authenticate')
    const authVerb = authHeader && authHeader.split(' ')[0].toLowerCase()
    request.debug('reauth', authVerb)

    switch (authVerb) {
      case 'basic':
        return this.basic(this.user, this.pass, true)

      case 'bearer':
        return this.bearer(this.bearerToken, true)

      case 'digest':
        return this.digest(request.method, request.path, authHeader)
    }
  }
}

module.exports = { Auth }
