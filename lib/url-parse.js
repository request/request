var url = require('url')
var urlEncoder = require('postman-url-encoder')
var EMPTY = ''
var STRING = 'string'
var AMPERSAND = '&'
var EQUALS = '='
var QUESTION_MARK = '?'
var stringify
var parse

/**
 * Parses a query string into an array, preserving parameter values
 *
 * @param string
 * @returns {*}
 */
parse = function (string) {
  var parts
  if (typeof string === STRING) { // eslint-disable-line valid-typeof
    parts = string.split(AMPERSAND)
    return parts.map(function (param, idx) {
      if (param === EMPTY && idx !== (parts.length - 1)) {
        return { key: null, value: null }
      }

      var index = (typeof param === STRING) ? param.indexOf(EQUALS) : -1 // eslint-disable-line valid-typeof
      var paramObj = {}

      // this means that there was no value for this key (not even blank, so we store this info) and the value is set
      // to null
      if (index < 0) {
        paramObj.key = param.substr(0, param.length)
        paramObj.value = null
      } else {
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
    var key = param.key
    var value = param.value

    if (value === undefined) {
      return ''
    }

    if (key === null) {
      key = ''
    }

    if (value === null) {
      return urlEncoder.encode(key)
    }

    return urlEncoder.encode(key) + EQUALS + urlEncoder.encode(value)
  }).join(AMPERSAND) : ''
}

/**
 * Correctly URL encodes query parameters in a URL and returns the final parsed URL.
 *
 * @param str
 */
module.exports = function (str) {
  var parsed = url.parse(str)
  var rawQs
  var search
  var path
  var qs

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
