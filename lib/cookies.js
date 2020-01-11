'use strict'

const { Cookie, CookieJar } = require('tough-cookie')

function parse (str) {
  if (str && str.uri) {
    str = str.uri
  }
  if (typeof str !== 'string') {
    throw new Error('The cookie function only accepts STRING as param')
  }
  return Cookie.parse(str, { loose: true })
}

// Adapt the sometimes-Async api of tough.CookieJar to our requirements
class RequestJar {
  constructor (store) {
    this._jar = new CookieJar(store, { looseMode: true })
  }

  setCookie (cookieOrStr, uri, options) {
    return this._jar.setCookieSync(cookieOrStr, uri, options || {})
  }

  getCookieString (uri) {
    return this._jar.getCookieStringSync(uri)
  }

  getCookies (uri) {
    return this._jar.getCookiesSync(uri)
  }
}

module.exports = { parse, jar: store => new RequestJar(store) }
