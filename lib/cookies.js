var optional = require('./optional')
var cookies = optional('request-cookies')
var noop = function(){}

if (!cookies || !cookies.Cookie) {
  exports.Cookie = function(){}
} else {
  exports.Cookie = cookies.Cookie
}

if (!cookies || !cookies.CookieJar) {
  exports.CookieJar = function(){}
  exports.CookieJar.prototype.add = noop
  exports.CookieJar.prototype.getCookieHeaderString = noop
} else {
  exports.CookieJar = cookies.CookieJar
}