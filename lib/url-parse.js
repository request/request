var url = require('url')
  , encode = function (value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase()
    })
  }
  , stringify = function (obj) {
    return obj ? Object.keys(obj).map(function (key) {
      var value = obj[key]

      if (value === undefined) {
        return ''
      }

      if (value === null) {
        return encode(key)
      }

      if (Array.isArray(value)) {
        var result = []

        value.slice().forEach(function (val2) {
          if (val2 === undefined) {
            return
          }

          if (val2 === null) {
            result.push(encode(key))
          } else {
            result.push(encode(key) + '=' + encode(val2))
          }
        })

        return result.join('&')
      }

      return encode(key) + '=' + encode(value)
    }).filter(function (x) {
      return x.length > 0
    }).join('&') : ''
  }

/**
 * Correctly URL encodes query parameters in a URL and returns the final parsed URL.
 *
 * @param str
 */
module.exports = function (str) {
  var parsed = url.parse(str, true),
    search,
    path,
    qs

  if (parsed.query && Object.keys(parsed.query).length) {
    qs = stringify(parsed.query)
    search = '?' + qs
    path = parsed.pathname + search

    parsed.query = qs
    parsed.search = search
    parsed.path = path

    str = url.format(parsed)
  }

  // Parse again, because Node does not guarantee consistency of properties
  return url.parse(str)
}
