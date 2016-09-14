var url = require('url')
  , STRING = 'string'
  , PERCENT = '%'
  , AMPERSAND = '&'
  , EQUALS = '='
  , QUESTION_MARK = '?'
  , stringify
  , parse
  , encode

/**
 * Percent encodes a query string according to RFC 3986
 *
 * @param value
 * @returns {string}
 */
encode = function (value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, function (c) {
    return PERCENT + c.charCodeAt(0).toString(16).toUpperCase()
  })
}

/**
 * Parses a query string into an array, preserving parameter values
 *
 * @param string
 * @returns {*}
 */
parse = function (string) {
  var parts
  if (typeof string === STRING) {
    parts = string.split(AMPERSAND)
    return parts.map(function (param) {
      var index = (typeof param === STRING) ? param.indexOf(EQUALS) : -1,
        paramObj = {}

      // this means that there was no value for this key (not even blank, so we store this info) and the value is set
      // to null
      if (index < 0) {
        paramObj.key = param.substr(0, param.length)
        paramObj.value = null
      }
      else {
        paramObj.key = param.substr(0, index)
        paramObj.value = param.substr(index + 1)
      }

      return paramObj
    })
  }
  return []
}

/**
 * Stringifies a query string, from an array of parameters
 *
 * @param parameters
 * @returns {string}
 */
stringify = function (parameters) {
  return parameters ? parameters.map(function (param) {
    var key = decodeURIComponent(param.key)
      , value = decodeURIComponent(param.value)

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
          result.push(encode(key) + EQUALS + encode(val2))
        }
      })

      return result.join(AMPERSAND)
    }

    return encode(key) + EQUALS + encode(value)
  }).filter(function (x) {
    return x.length > 0
  }).join(AMPERSAND) : ''
}

/**
 * Correctly URL encodes query parameters in a URL and returns the final parsed URL.
 *
 * @param str
 */
module.exports = function (str) {
  var parsed = url.parse(str),
    rawQs,
    search,
    path,
    qs

  rawQs = parsed.query

  if (rawQs && rawQs.length) {
    qs = stringify(parse(parsed.query))
    search = QUESTION_MARK + qs
    path = parsed.pathname + search

    parsed.query = qs
    parsed.search = search
    parsed.path = path

    str = url.format(parsed)
  }

  // Parse again, because Node does not guarantee consistency of properties
  return url.parse(str)
}
