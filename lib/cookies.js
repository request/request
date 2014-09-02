var optional = require('./optional')
  , tough = optional('tough-cookie')
  , Cookie = tough && tough.Cookie
  , CookieJar = tough && tough.CookieJar
  ;

exports.parse = function(str) {
  if (str && str.uri) str = str.uri
  if (typeof str !== 'string') throw new Error("The cookie function only accepts STRING as param")
  if (!Cookie) {
    return null;
  }
  return Cookie.parse(str)
};

exports.jar = function() {
  if (!CookieJar) {
    // tough-cookie not loaded, return a stub object:
    return {
      setCookieSync: function(){},
      getCookieStringSync: function(){},
      getCookiesSync: function(){}
    };
  }
  var jar = new CookieJar();
  jar._jar = jar;  // For backwards compatibility
  return jar;
};
