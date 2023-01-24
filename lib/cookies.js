'use strict'

var tough = require('@postman/tough-cookie')

var Cookie = tough.Cookie
var CookieJar = tough.CookieJar

exports.parse = function (str) {
  if (str && str.uri) {
    str = str.uri
  }
  if (typeof str !== 'string') {
    throw new Error('The cookie function only accepts STRING as param')
  }
  return Cookie.parse(str, {loose: true})
}

exports.jar = function (store) {
  return new CookieJar(store, {looseMode: true})
}
