var url = require('url')
  , EMPTY = ''
  , STRING = 'string'
  , PERCENT = '%'
  , AMPERSAND = '&'
  , EQUALS = '='
  , QUESTION_MARK = '?'
  , ENCODE_REGEX = /[!'()*]/g
  , stringify
  , parse
  , encode
  , percentEncode

percentEncode = function percentEncode(c) {
  var hex = c.toString(16).toUpperCase();
  (hex.length === 1) && (hex = '0' + hex)
  return '%' + hex
}


/**
 * Percent encodes a query string according to RFC 3986
 *
 * @param value
 * @returns {string}
 */
encode = function (value) {
  if (!value) { return '' }

  var buffer = new Buffer(value),
    ret = '',
    i

  for (i = 0; i < buffer.length; ++i) {
    if (buffer[i] < 0x21 || buffer[i] > 0x7E || buffer[i] === 0x22 || buffer[i] === 0x23 ||
        buffer[i] === 0x3C || buffer[i] === 0x3E) {
      ret += percentEncode(buffer[i])
    } else {
      ret += String.fromCodePoint(buffer[i])  // Only works in ES6 (available in Node v4+)
    }
  }

  return ret
      .replace(ENCODE_REGEX, function (c) {
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
    return parts.map(function (param, idx) {
      if (param === EMPTY && idx !== (parts.length - 1)) {
        return { key: null, value: null }
      }

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
    var key
      , value

    try { key = param.key && decodeURIComponent(param.key) }
    catch (e) { key = param.key }

    try { value = param.value && decodeURIComponent(param.value) }
    catch (e) { value = param.value }

    if (value === undefined) {
      return ''
    }

    if (key === null) {
      key = ''
    }

    if (value === null) {
      return encode(key)
    }

    return encode(key) + EQUALS + encode(value)
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

module.exports.parse = parse
module.exports.stringify = stringify
module.exports.encode = encode

if (!module.parent) {
  encode('обязательный')
}
