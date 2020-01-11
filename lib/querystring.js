'use strict'

var qs = require('qs')
var querystring = require('querystring')

class Querystring {
  constructor (request) {
    this.request = request
    this.lib = null
    this.useQuerystring = null
    this.parseOptions = null
    this.stringifyOptions = null
  }

  init (options) {
    if (this.lib) {
      return
    }

    this.useQuerystring = options.useQuerystring
    this.lib = this.useQuerystring ? querystring : qs

    this.parseOptions = options.qsParseOptions || {}
    this.stringifyOptions = options.qsStringifyOptions || {}
  }

  stringify (obj) {
    return this.useQuerystring
      ? this.rfc3986(
          this.lib.stringify(
            obj,
            this.stringifyOptions.sep || null,
            this.stringifyOptions.eq || null,
            this.stringifyOptions
          )
        )
      : this.lib.stringify(obj, this.stringifyOptions)
  }

  parse (str) {
    return this.useQuerystring
      ? this.lib.parse(
          str,
          this.parseOptions.sep || null,
          this.parseOptions.eq || null,
          this.parseOptions
        )
      : this.lib.parse(str, this.parseOptions)
  }

  rfc3986 (str) {
    return str.replace(/[!'()*]/g, c => {
      return (
        '%' +
        c
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()
      )
    })
  }

  unescape (str) {
    return querystring.unescape(str)
  }
}

module.exports = { Querystring }
