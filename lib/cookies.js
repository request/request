'use strict'

const tough = require('tough-cookie')

const Cookie = tough.Cookie
const CookieJar = tough.CookieJar

exports.parse = function (str) {
  if (str && str.uri) {
    str = str.uri
  }
  if (typeof str !== 'string') {
    throw new Error('The cookie function only accepts STRING as param')
  }
  return Cookie.parse(str, { loose: true })
}

// Adapt the sometimes-Async api of tough.CookieJar to our requirements
function RequestJar (store) {
  const self = this
  self._jar = new CookieJar(store, { looseMode: true })
}
RequestJar.prototype.setCookie = function (cookieOrStr, uri, options) {
  const self = this
  return self._jar.setCookieSync(cookieOrStr, uri, options || {})
}
RequestJar.prototype.getCookieString = function (uri) {
  const self = this
  return self._jar.getCookieStringSync(uri)
}
RequestJar.prototype.getCookies = function (uri) {
  const self = this
  return self._jar.getCookiesSync(uri)
}

exports.jar = function (store) {
  return new RequestJar(store)
}
