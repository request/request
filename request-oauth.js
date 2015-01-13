'use strict'

var querystring = require('querystring')
var qs = require('qs')
var caseless = require('caseless')
var uuid = require('node-uuid')
var oauth = require('oauth-sign')

/*
  var args = {
    uri: {},
    method: '',
    headers: {},
    body: {},
    qsLib: {},
    oauth: {}
  }
*/

exports.oauth = function (args) {
  if (!args.uri) {
    throw new Error('request-oauth: missing url argument')
  }
  if (!args.method) {
    throw new Error('request-oauth: missing method argument')
  }

  var uri = args.uri
  var method = args.method
  var headers = caseless(args.headers || {})
  var body = args.body || ''
  var qsLib = args.qsLib || qs
  var _oauth = args.oauth || {}
  

  var form, query, contentType = '', formContentType = 'application/x-www-form-urlencoded'

  if (headers.has('content-type') &&
      headers.get('content-type').slice(0, formContentType.length) === formContentType) {
    contentType = formContentType
    form = body
  }
  if (uri.query) {
    query = uri.query
  }

  var transport = _oauth.transport_method || 'header'
  if (transport === 'body' && (
      method !== 'POST' || contentType !== formContentType)) {

    throw new Error('oauth.transport_method of \'body\' requires \'POST\' ' +
      'and content-type \'' + formContentType + '\'')
  }

  delete _oauth.transport_method

  var oa = {}
  for (var i in _oauth) {
    oa['oauth_' + i] = _oauth[i]
  }
  if ('oauth_realm' in oa) {
    delete oa.oauth_realm
  }
  if (!oa.oauth_version) {
    oa.oauth_version = '1.0'
  }
  if (!oa.oauth_timestamp) {
    oa.oauth_timestamp = Math.floor( Date.now() / 1000 ).toString()
  }
  if (!oa.oauth_nonce) {
    oa.oauth_nonce = uuid().replace(/-/g, '')
  }
  if (!oa.oauth_signature_method) {
    oa.oauth_signature_method = 'HMAC-SHA1'
  }

  var consumer_secret_or_private_key = oa.oauth_consumer_secret || oa.oauth_private_key
  delete oa.oauth_consumer_secret
  delete oa.oauth_private_key
  var token_secret = oa.oauth_token_secret
  delete oa.oauth_token_secret

  var baseurl = uri.protocol + '//' + uri.host + uri.pathname
  var params = qsLib.parse([].concat(query, form, qsLib.stringify(oa)).join('&'))

  var signature = oauth.sign(
    oa.oauth_signature_method,
    method,
    baseurl,
    params,
    consumer_secret_or_private_key,
    token_secret)

  var buildSortedParams = function (sep, wrap) {
    wrap = wrap || ''
    return Object.keys(oa).sort().map(function (i) {
      return i + '=' + wrap + oauth.rfc3986(oa[i]) + wrap
    }).join(sep) + sep + 'oauth_signature=' + wrap + oauth.rfc3986(signature) + wrap
  }

  var data
  if (transport === 'header') {
    var realm = _oauth.realm ? 'realm="' + _oauth.realm + '",' : ''
    data = 'OAuth ' + realm + buildSortedParams(',', '"')
  }
  else if (transport === 'query') {
    data = (query ? '&' : '?') + buildSortedParams('&')
  }
  else if (transport === 'body') {
    data = (form ? form + '&' : '') + buildSortedParams('&')
  }
  else {
    throw new Error('request-oauth: oauth.transport_method invalid')
  }

  return {transport:transport, data:data}
}
