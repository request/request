'use strict'

const qs = require('qs')
const caseless = require('caseless')
const uuid = require('uuid/v4')
const oauth = require('oauth-sign')
const crypto = require('crypto')
const { Buffer } = require('safe-buffer')

class OAuth {
  constructor (request) {
    this.request = request
    this.params = null
  }

  buildParams (_oauth, uri, method, query, form, qsLib) {
    const oa = {}
    for (const i in _oauth) {
      oa['oauth_' + i] = _oauth[i]
    }
    if (!oa.oauth_version) {
      oa.oauth_version = '1.0'
    }
    if (!oa.oauth_timestamp) {
      oa.oauth_timestamp = Math.floor(Date.now() / 1000).toString()
    }
    if (!oa.oauth_nonce) {
      oa.oauth_nonce = uuid().replace(/-/g, '')
    }
    if (!oa.oauth_signature_method) {
      oa.oauth_signature_method = 'HMAC-SHA1'
    }

    const consumer_secret_or_private_key = // eslint-disable-line camelcase
      oa.oauth_consumer_secret || oa.oauth_private_key
    delete oa.oauth_consumer_secret
    delete oa.oauth_private_key

    const token_secret = oa.oauth_token_secret // eslint-disable-line camelcase
    delete oa.oauth_token_secret

    const realm = oa.oauth_realm
    delete oa.oauth_realm
    delete oa.oauth_transport_method

    const baseurl = uri.protocol + '//' + uri.host + uri.pathname
    const params = qsLib.parse(
      [].concat(query, form, qsLib.stringify(oa)).join('&')
    )

    oa.oauth_signature = oauth.sign(
      oa.oauth_signature_method,
      method,
      baseurl,
      params,
      consumer_secret_or_private_key, // eslint-disable-line camelcase
      token_secret // eslint-disable-line camelcase
    )

    if (realm) {
      oa.realm = realm
    }

    return oa
  }

  buildBodyHash (_oauth, body) {
    if (
      ['HMAC-SHA1', 'RSA-SHA1'].indexOf(
        _oauth.signature_method || 'HMAC-SHA1'
      ) < 0
    ) {
      this.request.emit(
        'error',
        new Error(
          'oauth: ' +
            _oauth.signature_method +
            ' signature_method not supported with body_hash signing.'
        )
      )
    }

    const shasum = crypto.createHash('sha1')
    shasum.update(body || '')
    const sha1 = shasum.digest('hex')

    return Buffer.from(sha1, 'hex').toString('base64')
  }

  concatParams (oa, sep, wrap) {
    wrap = wrap || ''

    const params = Object.keys(oa)
      .filter(i => {
        return i !== 'realm' && i !== 'oauth_signature'
      })
      .sort()

    if (oa.realm) {
      params.splice(0, 0, 'realm')
    }
    params.push('oauth_signature')

    return params
      .map(i => {
        return i + '=' + wrap + oauth.rfc3986(oa[i]) + wrap
      })
      .join(sep)
  }

  onRequest (_oauth) {
    this.params = _oauth

    const uri = this.request.uri || {}
    const method = this.request.method || ''
    const headers = caseless(this.request.headers)
    const body = this.request.body || ''
    const qsLib = this.request.qsLib || qs

    let form
    const query = uri.search.substring(1)
    let contentType = headers.get('content-type') || ''
    const formContentType = 'application/x-www-form-urlencoded'
    const transport = _oauth.transport_method || 'header'

    if (contentType.slice(0, formContentType.length) === formContentType) {
      contentType = formContentType
      form = body
    }
    if (
      transport === 'body' &&
      (method !== 'POST' || contentType !== formContentType)
    ) {
      this.request.emit(
        'error',
        new Error(
          'oauth: transport_method of body requires POST ' +
            'and content-type ' +
            formContentType
        )
      )
    }

    if (!form && typeof _oauth.body_hash === 'boolean') {
      _oauth.body_hash = this.buildBodyHash(
        _oauth,
        this.request.body.toString()
      )
    }

    const oa = this.buildParams(_oauth, uri, method, query, form, qsLib)

    switch (transport) {
      case 'header':
        this.request.setHeader(
          'Authorization',
          'OAuth ' + this.concatParams(oa, ',', '"')
        )
        break

      case 'query':
        this.request.uri = new URL(
          (this.request.uri.href +=
            (query ? '&' : '?') + this.concatParams(oa, '&'))
        )
        this.request.path = this.request.uri.pathname + this.request.uri.search
        break

      case 'body':
        this.request.body =
          (form ? form + '&' : '') + this.concatParams(oa, '&')
        break

      default:
        this.request.emit(
          'error',
          new Error('oauth: transport_method invalid')
        )
    }
  }
}

module.exports = { OAuth }
