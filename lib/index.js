var util = require('util')
  , url = require('url')
  , qs = require('querystring')

  , HTTPDuplex = require('http-duplex-client')
  , HTTPGzipDuplex = require('http-duplex-gzip-client')
  , BL = require('bl')

  , defaults = require('defaults')
  , safeStringify = require('json-stringify-safe')
  , once = require('once')
  , caseless = require('caseless')

  , debug = require('./debug')

  , noop = function () {}

  , _http =
    { 'http:': require('http')
    , 'https:': require('https')
    }

  , _defaults =
    { gzip: true
    , bl: undefined
    , headers: {}
    , method: 'GET'

    , localAddress: undefined
    , socketPath: undefined
    , agent: undefined

    , encoding: 'utf8'
    }
  ;

function toJSON (val) {
  try {
    return JSON.stringify(val)
  } catch (e) {
    return safeStringify(val)
  }
}

function makeRequest () {
  var opts =
    { method: this.method
    , path: this._uri.path
    , port: this._uri.port
    , hostname: this._uri.hostname
    , host: this._uri.host
    , localAddress: this.localAddress
    , socketPath: this.socketPath
    , headers: this._headers.dict
    , agent: this.agent
    }

  this.http = _http[this._uri.protocol]
  if (!this.http) this.emit('error', new Error('Unknown protocol scheme "'+this._uri.protocol+'"'))

  if (this.gzip) HTTPGzipDuplex.prototype.makeRequest.call(this, opts)
  else HTTPDuplex.prototype.makeRequest.call(this, opts)
}

function parseOptions (options) {
  options = defaults(options, _defaults)
  if (options.url) options.uri = url.parse(options.url)
  return options
}

util.inherits(Request, HTTPGzipDuplex)
function Request (options) {
  this._headers = undefined
  this._json = false
  this.body = undefined

  options = parseOptions(options)

  this.headers(options.headers)
  delete options.headers

  for (var i in options) {
    if (i[0] === '_' || !this[i]) this[i] = options[i]
    else this[i](options[i])
  }

  if (this.callback) this.callback = once(this.callback)

  var self = this
  this.on('response', function (resp) { self.response = resp })
  this.on('body', function () {
    if (self.encoding !== null && self.encoding !== 'binary') {
      self.response.body = self.response.body.toString(self.encoding)
    }
    if (self._json) {
      try {
        self.response.body = JSON.parse(self.response.body)
      } catch (e) {}
    }
  })

  process.nextTick(this.start.bind(this))
  HTTPGzipDuplex.call(this, {}, options.stream)
  this.makeRequest = makeRequest
}
Request.prototype.start = function () {
  var self = this
  if (this.callback) {
    this.bl = new BL()
    this.pipe(this.bl)

    this.on('end', function () {
      self.response.body = self.bl
      this.emit('body')
      self.callback(null, self.response, self.response.body)
    })
    this.on('error', function (err) {
      self.callback(err)
    })
  }

  this.makeRequest()
  if (this.method === 'GET' || this.method === 'HEAD') {
    this.end()
  }
  if (this.body) {
    if (!Buffer.isBuffer(this.body)) this.body = new Buffer(this.body)
    this.setHeader('content-length', this.body.length)
    this.write(this.body)
    this.end()
  }
}
Request.prototype.makeRequest = noop
Request.prototype.json = function (val) {
  if (val !== false) {
    this._json = true
    this.setHeader('accept', 'application/json')
  }
  if (typeof val !== 'boolean') {
    this.setHeader('content-type', 'application/json')
    this.body = new Buffer(toJSON(val))
  }
}
Request.prototype.headers = function (headers) {
  this._headers = caseless(headers)
}
Request.prototype.setHeader = function (name, value, clobber) {
  return this._headers.set(name, value, clobber)
}
Request.prototype.hasHeader = function (name) {
  return this._headers.has(name)
}
Request.prototype.setHeaders = function (headers, clobbler) {
  return this._headers.set(name, clobber)
}
Request.prototype.url = function (u) {
  if (typeof u === 'string') u = url.parse(u)
  this._uri = u
}
Request.prototype.uri = Request.prototype.url

function request (uri, options, callback) {
  if (typeof uri === 'undefined') throw new Error('undefined is not a valid uri or options object.')
  if ((typeof options === 'function') && !callback) callback = options
  if (options && typeof options === 'object') {
    options.uri = uri
  } else if (typeof uri === 'string') {
    options = {uri:uri}
  } else {
    options = uri
  }

  options = defaults({}, options)

  if (callback) options.callback = callback
  var r = new Request(options)
  return r
}

module.exports = request