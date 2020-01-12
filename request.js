'use strict'

const http = require('http')
const https = require('https')
const url = require('url')
const util = require('util')
const stream = require('stream')
const zlib = require('zlib')
const aws2 = require('aws-sign2')
const aws4 = require('aws4')
const httpSignature = require('http-signature')
const mime = require('mime-types')
const caseless = require('caseless')
const ForeverAgent = require('forever-agent')
const FormData = require('form-data')
const extend = require('extend')
const isstream = require('isstream')
const isTypedArray = require('is-typedarray').strict
const {safeStringify, isReadStream, toBase64, defer, copy, version} = require('./lib/helpers')
const cookies = require('./lib/cookies')
const getProxyFromURI = require('./lib/getProxyFromURI')
const {Querystring} = require('./lib/querystring')
const {Har} = require('./lib/har')
const {Auth} = require('./lib/auth')
const {OAuth} = require('./lib/oauth')
const hawk = require('./lib/hawk')
const {Multipart} = require('./lib/multipart')
const {Redirect} = require('./lib/redirect')
const {Tunnel} = require('./lib/tunnel')
const now = require('performance-now')
const {Buffer} = require('safe-buffer')

const globalCookieJar = cookies.jar()

const globalPool = {}

function filterForNonReserved (reserved, options) {
  // Filter out properties that are not reserved.
  // Reserved values are passed in at call site.

  const object = {}
  for (const i in options) {
    const notReserved = (reserved.indexOf(i) === -1)
    if (notReserved) {
      object[i] = options[i]
    }
  }
  return object
}

function filterOutReservedFunctions (reserved, options) {
  // Filter out properties that are functions and are reserved.
  // Reserved values are passed in at call site.

  const object = {}
  for (const i in options) {
    const isReserved = !(reserved.indexOf(i) === -1)
    const isFunction = (typeof options[i] === 'function')
    if (!(isReserved && isFunction)) {
      object[i] = options[i]
    }
  }
  return object
}

class Request extends stream.Stream {
  constructor (options) {
    super()
    // if given the method property in options, set property explicitMethod to true

    // extend the Request instance with any non-reserved properties
    // remove any reserved functions from the options object
    // set Request instance to be readable and writable
    // call init

    // start with HAR, then override with additional options
    if (options.har) {
      this._har = new Har(this)
      options = this._har.options(options)
    }

    const reserved = Object.keys(Request.prototype)
    const nonReserved = filterForNonReserved(reserved, options)

    extend(this, nonReserved)
    options = filterOutReservedFunctions(reserved, options)

    this.readable = true
    this.writable = true
    if (options.method) {
      this.explicitMethod = true
    }
    this._qs = new Querystring(this)
    this._auth = new Auth(this)
    this._oauth = new OAuth(this)
    this._multipart = new Multipart(this)
    this._redirect = new Redirect(this)
    this._tunnel = new Tunnel(this)
    this.init(options)
  }

  debug () {
    debug()
  }

  getNewAgent () {
    const Agent = this.agentClass
    const options = {}
    if (this.agentOptions) {
      for (const i in this.agentOptions) {
        options[i] = this.agentOptions[i]
      }
    }
    if (this.ca) {
      options.ca = this.ca
    }
    if (this.ciphers) {
      options.ciphers = this.ciphers
    }
    if (this.secureProtocol) {
      options.secureProtocol = this.secureProtocol
    }
    if (this.secureOptions) {
      options.secureOptions = this.secureOptions
    }
    if (typeof this.rejectUnauthorized !== 'undefined') {
      options.rejectUnauthorized = this.rejectUnauthorized
    }

    if (this.cert && this.key) {
      options.key = this.key
      options.cert = this.cert
    }

    if (this.pfx) {
      options.pfx = this.pfx
    }

    if (this.passphrase) {
      options.passphrase = this.passphrase
    }

    let poolKey = ''

    // different types of agents are in different pools
    if (Agent !== this.httpModule.Agent) {
      poolKey += Agent.name
    }

    // ca option is only relevant if proxy or destination are https
    if (typeof this.proxy === 'string') {
      this.proxy = url.parse(this.proxy)
    }
    const isHttps =
      (this.proxy && this.proxy.protocol === 'https:') || this.uri.protocol === 'https:'

    if (isHttps) {
      if (options.ca) {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey += options.ca
      }

      if (typeof options.rejectUnauthorized !== 'undefined') {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey += options.rejectUnauthorized
      }

      if (options.cert) {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey +=
          options.cert.toString('ascii') + options.key.toString('ascii')
      }

      if (options.pfx) {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey += options.pfx.toString('ascii')
      }

      if (options.ciphers) {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey += options.ciphers
      }

      if (options.secureProtocol) {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey += options.secureProtocol
      }

      if (options.secureOptions) {
        if (poolKey) {
          poolKey += ':'
        }
        poolKey += options.secureOptions
      }
    }

    if (
      this.pool === globalPool &&
      !poolKey &&
      Object.keys(options).length === 0 &&
      this.httpModule.globalAgent
    ) {
      // not doing anything special.  Use the globalAgent
      return this.httpModule.globalAgent
    }

    // we're using a stored agent.  Make sure it's protocol-specific
    poolKey = this.uri.protocol + poolKey

    // generate a new agent for this setting if none yet exists
    if (!this.pool[poolKey]) {
      this.pool[poolKey] = new Agent(options)
      // properly set maxSockets on new agents
      if (this.pool.maxSockets) {
        this.pool[poolKey].maxSockets = this.pool.maxSockets
      }
    }

    return this.pool[poolKey]
  }

  onRequestError (error) {
    if (this._aborted) {
      return
    }
    if (
      this.req &&
      this.req._reusedSocket &&
      error.code === 'ECONNRESET' &&
      this.agent.addRequestNoreuse
    ) {
      this.agent = {
        addRequest: this.agent.addRequestNoreuse.bind(this.agent)
      }
      this.start()
      this.req.end()
      return
    }
    this.clearTimeout()
    this.emit('error', error)
  }

  onRequestResponse (response) {
    if (this.timing) {
      this.timings.response = now() - this.startTimeNow
    }

    debug(
      'onRequestResponse',
      this.uri.href,
      response.statusCode,
      response.headers
    )
    response.on('end', () => {
      if (this.timing) {
        this.timings.end = now() - this.startTimeNow
        response.timingStart = this.startTime

        // fill in the blanks for any periods that didn't trigger, such as
        // no lookup or connect due to keep alive
        if (!this.timings.socket) {
          this.timings.socket = 0
        }
        if (!this.timings.lookup) {
          this.timings.lookup = this.timings.socket
        }
        if (!this.timings.connect) {
          this.timings.connect = this.timings.lookup
        }
        if (!this.timings.response) {
          this.timings.response = this.timings.connect
        }

        debug('elapsed time', this.timings.end)

        // elapsedTime includes all redirects
        this.elapsedTime += Math.round(this.timings.end)

        // NOTE: elapsedTime is deprecated in favor of .timings
        response.elapsedTime = this.elapsedTime

        // timings is just for the final fetch
        response.timings = this.timings

        // pre-calculate phase timings as well
        response.timingPhases = {
          wait: this.timings.socket,
          dns: this.timings.lookup - this.timings.socket,
          tcp: this.timings.connect - this.timings.lookup,
          firstByte: this.timings.response - this.timings.connect,
          download: this.timings.end - this.timings.response,
          total: this.timings.end
        }
      }
      debug(
        'response end',
        this.uri.href,
        response.statusCode,
        response.headers
      )
    })

    if (this._aborted) {
      debug('aborted', this.uri.href)
      response.resume()
      return
    }

    this.response = response
    response.request = this
    response.toJSON = this.responseToJSON

    // XXX This is different on 0.10, because SSL is strict by default
    if (
      this.httpModule === https &&
      this.strictSSL &&
      (!Object.prototype.hasOwnProperty.call(response, 'socket') ||
        !response.socket.authorized)
    ) {
      debug('strict ssl error', this.uri.href)
      const sslErr = Object.prototype.hasOwnProperty.call(response, 'socket')
        ? response.socket.authorizationError
        : this.uri.href + ' does not support SSL'
      this.emit('error', new Error('SSL Error: ' + sslErr))
      return
    }

    // Save the original host before any redirect (if it changes, we need to
    // remove any authorization headers).  Also remember the case of the header
    // name because lots of broken servers expect Host instead of host and we
    // want the caller to be able to specify this.
    this.originalHost = this.getHeader('host')
    if (!this.originalHostHeaderName) {
      this.originalHostHeaderName = this.hasHeader('host')
    }
    if (this.setHost) {
      this.removeHeader('host')
    }
    this.clearTimeout()

    const targetCookieJar =
      this._jar && this._jar.setCookie ? this._jar : globalCookieJar
    const addCookie = cookie => {
      // set the cookie if it's domain in the href's domain.
      try {
        targetCookieJar.setCookie(cookie, this.uri.href, { ignoreError: true })
      } catch (e) {
        this.emit('error', e)
      }
    }

    response.caseless = caseless(response.headers)

    if (response.caseless.has('set-cookie') && !this._disableCookies) {
      const headerName = response.caseless.has('set-cookie')
      if (Array.isArray(response.headers[headerName])) {
        response.headers[headerName].forEach(addCookie)
      } else {
        addCookie(response.headers[headerName])
      }
    }

    if (this._redirect.onResponse(response)) {
      return // Ignore the rest of the response
    } else {
      // Be a good stream and emit end when the response is finished.
      // Hack to emit end on close because of a core bug that never fires end
      response.on('close', () => {
        if (!this._ended) {
          this.response.emit('end')
        }
      })

      response.once('end', () => {
        this._ended = true
      })

      const noBody = code => {
        return (
          this.method === 'HEAD' ||
          // Informational
          (code >= 100 && code < 200) ||
          // No Content
          code === 204 ||
          // Not Modified
          code === 304
        )
      }

      let responseContent
      if (this.gzip && !noBody(response.statusCode)) {
        let contentEncoding =
          response.headers['content-encoding'] || 'identity'
        contentEncoding = contentEncoding.trim().toLowerCase()

        // Be more lenient with decoding compressed responses, since (very rarely)
        // servers send slightly invalid gzip responses that are still accepted
        // by common browsers.
        // Always using Z_SYNC_FLUSH is what cURL does.
        const zlibOptions = {
          flush: zlib.Z_SYNC_FLUSH,
          finishFlush: zlib.Z_SYNC_FLUSH
        }

        if (contentEncoding === 'gzip') {
          responseContent = zlib.createGunzip(zlibOptions)
          response.pipe(responseContent)
        } else if (contentEncoding === 'deflate') {
          responseContent = zlib.createInflate(zlibOptions)
          response.pipe(responseContent)
        } else {
          // Since previous versions didn't check for Content-Encoding header,
          // ignore any invalid values to preserve backwards-compatibility
          if (contentEncoding !== 'identity') {
            debug('ignoring unrecognized Content-Encoding ' + contentEncoding)
          }
          responseContent = response
        }
      } else {
        responseContent = response
      }

      if (this.encoding) {
        if (this.dests.length !== 0) {
          console.error(
            'Ignoring encoding parameter as this stream is being piped to another stream which makes the encoding option invalid.'
          )
        } else {
          responseContent.setEncoding(this.encoding)
        }
      }

      if (this._paused) {
        responseContent.pause()
      }

      this.responseContent = responseContent

      this.emit('response', response)

      this.dests.forEach(dest => this.pipeDest(dest))

      responseContent.on('data', chunk => {
        if (this.timing && !this.responseStarted) {
          this.responseStartTime = new Date().getTime()

          // NOTE: responseStartTime is deprecated in favor of .timings
          response.responseStartTime = this.responseStartTime
        }
        this._destdata = true
        this.emit('data', chunk)
      })
      responseContent.once('end', chunk => this.emit('end', chunk))
      responseContent.on('error', error => this.emit('error', error))
      responseContent.on('close', () => this.emit('close'))

      if (this.callback) {
        this.readResponseBody(response)
      } else {
        // if no callback
        this.on('end', () => {
          if (this._aborted) {
            debug('aborted', this.uri.href)
            return
          }
          this.emit('complete', response)
        })
      }
    }
    debug('finish init function', this.uri.href)
  }

  readResponseBody (response) {
    debug("reading response's body")
    let buffers = []
    let bufferLength = 0
    const strings = []

    this.on('data', chunk => {
      if (!Buffer.isBuffer(chunk)) {
        strings.push(chunk)
      } else if (chunk.length) {
        bufferLength += chunk.length
        buffers.push(chunk)
      }
    })
    this.on('end', () => {
      debug('end event', this.uri.href)
      if (this._aborted) {
        debug('aborted', this.uri.href)
        // `buffer` is defined in the parent scope and used in a closure it exists for the life of the request.
        // This can lead to leaky behavior if the user retains a reference to the request object.
        buffers = []
        bufferLength = 0
        return
      }

      if (bufferLength) {
        debug('has body', this.uri.href, bufferLength)
        response.body = Buffer.concat(buffers, bufferLength)
        if (this.encoding !== null) {
          response.body = response.body.toString(this.encoding)
        }
        // `buffer` is defined in the parent scope and used in a closure it exists for the life of the Request.
        // This can lead to leaky behavior if the user retains a reference to the request object.
        buffers = []
        bufferLength = 0
      } else if (strings.length) {
        // The UTF8 BOM [0xEF,0xBB,0xBF] is converted to [0xFE,0xFF] in the JS UTC16/UCS2 representation.
        // Strip this value out when the encoding is set to 'utf8', as upstream consumers won't expect it and it breaks JSON.parse().
        if (
          this.encoding === 'utf8' &&
          strings[0].length > 0 &&
          strings[0][0] === '\uFEFF'
        ) {
          strings[0] = strings[0].substring(1)
        }
        response.body = strings.join('')
      }

      if (this._json) {
        try {
          response.body = JSON.parse(response.body, this._jsonReviver)
        } catch (e) {
          debug('invalid JSON received', this.uri.href)
        }
      }
      debug('emitting complete', this.uri.href)
      if (typeof response.body === 'undefined' && !this._json) {
        response.body = this.encoding === null ? Buffer.alloc(0) : ''
      }
      this.emit('complete', response, response.body)
    })
  }

  init (options) {
    // init() contains all the code to setup the request object.
    // the actual outgoing request is not started until start() is called
    // this function is called from both the constructor and on redirect.
    if (!options) {
      options = {}
    }
    this.headers = this.headers ? copy(this.headers) : {}

    // Delete headers with value undefined since they break
    // ClientRequest.OutgoingMessage.setHeader in node 0.12
    for (const headerName in this.headers) {
      if (typeof this.headers[headerName] === 'undefined') {
        delete this.headers[headerName]
      }
    }

    caseless.httpify(this, this.headers)

    if (!this.method) {
      this.method = options.method || 'GET'
    }
    if (!this.localAddress) {
      this.localAddress = options.localAddress
    }

    this._qs.init(options)

    debug(options)
    if (!this.pool && this.pool !== false) {
      this.pool = globalPool
    }
    this.dests = this.dests || []
    this.__isRequestRequest = true

    // Protect against double callback
    if (!this._callback && this.callback) {
      this._callback = this.callback
      this.callback = (...params) => {
        if (this._callbackCalled) {
          return // Print a warning maybe?
        }
        this._callbackCalled = true
        this._callback(...params)
      }
      this.on('error', this.callback.bind())
      this.on('complete', this.callback.bind(this, null))
    }

    // People use this property instead all the time, so support it
    if (!this.uri && this.url) {
      this.uri = this.url
      delete this.url
    }

    // If there's a baseUrl, then use it as the base URL (i.e. uri must be
    // specified as a relative path and is appended to baseUrl).
    if (this.baseUrl) {
      if (typeof this.baseUrl !== 'string') {
        return this.emit('error', new Error('options.baseUrl must be a string'))
      }

      if (typeof this.uri !== 'string') {
        return this.emit('error', new Error('options.uri must be a string when using options.baseUrl'))
      }

      if (this.uri.indexOf('//') === 0 || this.uri.indexOf('://') !== -1) {
        return this.emit('error', new Error('options.uri must be a path when using options.baseUrl'))
      }

      // Handle all cases to make sure that there's only one slash between
      // baseUrl and uri.
      const baseUrlEndsWithSlash = this.baseUrl.lastIndexOf('/') === this.baseUrl.length - 1
      const uriStartsWithSlash = this.uri.indexOf('/') === 0

      if (baseUrlEndsWithSlash && uriStartsWithSlash) {
        this.uri = this.baseUrl + this.uri.slice(1)
      } else if (baseUrlEndsWithSlash || uriStartsWithSlash) {
        this.uri = this.baseUrl + this.uri
      } else if (this.uri === '') {
        this.uri = this.baseUrl
      } else {
        this.uri = this.baseUrl + '/' + this.uri
      }
      delete this.baseUrl
    }

    // A URI is needed by this point, emit error if we haven't been able to get one
    if (!this.uri) {
      return this.emit('error', new Error('options.uri is a required argument'))
    }

    // If a string URI/URL was given, parse it into a URL object
    if (typeof this.uri === 'string') {
      this.uri = url.parse(this.uri)
    }

    // Some URL objects are not from a URL parsed string and need href added
    if (!this.uri.href) {
      this.uri.href = url.format(this.uri)
    }

    // DEPRECATED: Warning for users of the old Unix Sockets URL Scheme
    if (this.uri.protocol === 'unix:') {
      return this.emit('error', new Error('`unix://` URL scheme is no longer supported. Please use the format `http://unix:SOCKET:PATH`'))
    }

    // Support Unix Sockets
    if (this.uri.host === 'unix') {
      this.enableUnixSocket()
    }

    if (this.strictSSL === false) {
      this.rejectUnauthorized = false
    }

    if (!this.uri.pathname) { this.uri.pathname = '/' }

    if (!(this.uri.host || (this.uri.hostname && this.uri.port)) && !this.uri.isUnix) {
      // Invalid URI: it may generate lot of bad errors, like 'TypeError: Cannot call method `indexOf` of undefined' in CookieJar
      // Detect and reject it as soon as possible
      const faultyUri = url.format(this.uri)
      let message = 'Invalid URI "' + faultyUri + '"'
      if (Object.keys(options).length === 0) {
        // No option ? This can be the sign of a redirect
        // As this is a case where the user cannot do anything (they didn't call request directly with this URL)
        // they should be warned that it can be caused by a redirection (can save some hair)
        message += '. This can be caused by a crappy redirection.'
      }
      // This error was fatal
      this.abort()
      return this.emit('error', new Error(message))
    }

    if (!this.hasOwnProperty('proxy')) {
      this.proxy = getProxyFromURI(this.uri)
    }

    this.tunnel = this._tunnel.isEnabled()
    if (this.proxy) {
      this._tunnel.setup(options)
    }

    this._redirect.onRequest(options)

    this.setHost = false
    if (!this.hasHeader('host')) {
      const hostHeaderName = this.originalHostHeaderName || 'host'
      this.setHeader(hostHeaderName, this.uri.host)
      // Drop :port suffix from Host header if known protocol.
      if (this.uri.port) {
        if ((this.uri.port === '80' && this.uri.protocol === 'http:') ||
            (this.uri.port === '443' && this.uri.protocol === 'https:')) {
          this.setHeader(hostHeaderName, this.uri.hostname)
        }
      }
      this.setHost = true
    }

    this.jar(this._jar || options.jar)

    if (!this.uri.port) {
      if (this.uri.protocol === 'http:') { this.uri.port = 80 } else if (this.uri.protocol === 'https:') { this.uri.port = 443 }
    }

    if (this.proxy && !this.tunnel) {
      this.port = this.proxy.port
      this.host = this.proxy.hostname
    } else {
      this.port = this.uri.port
      this.host = this.uri.hostname
    }

    if (options.form) {
      this.form(options.form)
    }

    if (options.formData) {
      const formData = options.formData
      const requestForm = this.form()
      const appendFormValue = (key, value) => {
        if (value && value.hasOwnProperty('value') && value.hasOwnProperty('options')) {
          requestForm.append(key, value.value, value.options)
        } else {
          requestForm.append(key, value)
        }
      }
      for (const formKey in formData) {
        if (formData.hasOwnProperty(formKey)) {
          const formValue = formData[formKey]
          if (formValue instanceof Array) {
            for (let j = 0; j < formValue.length; j++) {
              appendFormValue(formKey, formValue[j])
            }
          } else {
            appendFormValue(formKey, formValue)
          }
        }
      }
    }

    if (options.qs) {
      this.qs(options.qs)
    }

    if (this.uri.path) {
      this.path = this.uri.path
    } else {
      this.path = this.uri.pathname + (this.uri.search || '')
    }

    if (this.path.length === 0) {
      this.path = '/'
    }

    // Auth must happen last in case signing is dependent on other headers
    if (options.aws) {
      this.aws(options.aws)
    }

    if (options.hawk) {
      this.hawk(options.hawk)
    }

    if (options.httpSignature) {
      this.httpSignature(options.httpSignature)
    }

    if (options.auth) {
      if (Object.prototype.hasOwnProperty.call(options.auth, 'username')) {
        options.auth.user = options.auth.username
      }
      if (Object.prototype.hasOwnProperty.call(options.auth, 'password')) {
        options.auth.pass = options.auth.password
      }

      this.auth(
        options.auth.user,
        options.auth.pass,
        options.auth.sendImmediately,
        options.auth.bearer
      )
    }

    if (this.gzip && !this.hasHeader('accept-encoding')) {
      this.setHeader('accept-encoding', 'gzip, deflate')
    }

    if (this.uri.auth && !this.hasHeader('authorization')) {
      const uriAuthPieces = this.uri.auth.split(':').map((item) => { return this._qs.unescape(item) })
      this.auth(uriAuthPieces[0], uriAuthPieces.slice(1).join(':'), true)
    }

    if (!this.tunnel && this.proxy && this.proxy.auth && !this.hasHeader('proxy-authorization')) {
      const proxyAuthPieces = this.proxy.auth.split(':').map((item) => { return this._qs.unescape(item) })
      const authHeader = 'Basic ' + toBase64(proxyAuthPieces.join(':'))
      this.setHeader('proxy-authorization', authHeader)
    }

    if (this.proxy && !this.tunnel) {
      this.path = (this.uri.protocol + '//' + this.uri.host + this.path)
    }

    if (options.json) {
      this.json(options.json)
    }
    if (options.multipart) {
      this.multipart(options.multipart)
    }

    if (options.time) {
      this.timing = true

      // NOTE: elapsedTime is deprecated in favor of .timings
      this.elapsedTime = this.elapsedTime || 0
    }

    const setContentLength = () => {
      if (isTypedArray(this.body)) {
        this.body = Buffer.from(this.body)
      }

      if (!this.hasHeader('content-length')) {
        let length
        if (typeof this.body === 'string') {
          length = Buffer.byteLength(this.body)
        } else if (Array.isArray(this.body)) {
          length = this.body.reduce((a, b) => { return a + b.length }, 0)
        } else {
          length = this.body.length
        }

        if (length) {
          this.setHeader('content-length', length)
        } else {
          this.emit('error', new Error('Argument error, options.body.'))
        }
      }
    }
    if (this.body && !isstream(this.body)) {
      setContentLength()
    }

    if (options.oauth) {
      this.oauth(options.oauth)
    } else if (this._oauth.params && this.hasHeader('authorization')) {
      this.oauth(this._oauth.params)
    }

    const protocol = this.proxy && !this.tunnel ? this.proxy.protocol : this.uri.protocol
    const defaultModules = {'http:': http, 'https:': https}
    const httpModules = this.httpModules || {}

    this.httpModule = httpModules[protocol] || defaultModules[protocol]

    if (!this.httpModule) {
      return this.emit('error', new Error('Invalid protocol: ' + protocol))
    }

    if (options.ca) {
      this.ca = options.ca
    }

    if (!this.agent) {
      if (options.agentOptions) {
        this.agentOptions = options.agentOptions
      }

      if (options.agentClass) {
        this.agentClass = options.agentClass
      } else if (options.forever) {
        const v = version()
        // use ForeverAgent in node 0.10- only
        if (v.major === 0 && v.minor <= 10) {
          this.agentClass = protocol === 'http:' ? ForeverAgent : ForeverAgent.SSL
        } else {
          this.agentClass = this.httpModule.Agent
          this.agentOptions = this.agentOptions || {}
          this.agentOptions.keepAlive = true
        }
      } else {
        this.agentClass = this.httpModule.Agent
      }
    }

    if (this.pool === false) {
      this.agent = false
    } else {
      this.agent = this.agent || this.getNewAgent()
    }

    this.on('pipe', (src) => {
      if (this.ntick && this._started) {
        this.emit('error', new Error('You cannot pipe to this stream after the outbound request has started.'))
      }
      this.src = src
      if (isReadStream(src)) {
        if (!this.hasHeader('content-type')) {
          this.setHeader('content-type', mime.lookup(src.path))
        }
      } else {
        if (src.headers) {
          for (const i in src.headers) {
            if (!this.hasHeader(i)) {
              this.setHeader(i, src.headers[i])
            }
          }
        }
        if (this._json && !this.hasHeader('content-type')) {
          this.setHeader('content-type', 'application/json')
        }
        if (src.method && !this.explicitMethod) {
          this.method = src.method
        }
      }

    // self.on('pipe', function () {
    //   console.error('You have already piped to this stream. Pipeing twice is likely to break the request.')
    // })
    })

    defer(() => {
      if (this._aborted) {
        return
      }

      const end = () => {
        if (this._form) {
          if (!this._auth.hasAuth) {
            this._form.pipe(this)
          } else if (this._auth.hasAuth && this._auth.sentAuth) {
            this._form.pipe(this)
          }
        }
        if (this._multipart && this._multipart.chunked) {
          this._multipart.body.pipe(this)
        }
        if (this.body) {
          if (isstream(this.body)) {
            this.body.pipe(this)
          } else {
            setContentLength()
            if (Array.isArray(this.body)) {
              this.body.forEach((part) => {
                this.write(part)
              })
            } else {
              this.write(this.body)
            }
            this.end()
          }
        } else if (this.requestBodyStream) {
          console.warn('options.requestBodyStream is deprecated, please pass the request object to stream.pipe.')
          this.requestBodyStream.pipe(this)
        } else if (!this.src) {
          if (this._auth.hasAuth && !this._auth.sentAuth) {
            this.end()
            return
          }
          if (this.method !== 'GET' && typeof this.method !== 'undefined') {
            this.setHeader('content-length', 0)
          }
          this.end()
        }
      }

      if (this._form && !this.hasHeader('content-length')) {
        // Before ending the request, we had to compute the length of the whole form, asyncly
        this.setHeader(this._form.getHeaders(), true)
        this._form.getLength((err, length) => {
          if (!err && !isNaN(length)) {
            this.setHeader('content-length', length)
          }
          end()
        })
      } else {
        end()
      }

      this.ntick = true
    })
  }

  start () {
    // start() is called once we are ready to send the outgoing HTTP request.
    // this is usually called on the first write(), end() or on nextTick()

    let startTime
    let startTimeNow

    if (this.timing) {
      // All timings will be relative to this request's startTime.  In order to do this,
      // we need to capture the wall-clock start time (via Date), immediately followed
      // by the high-resolution timer (via now()).  While these two won't be set
      // at the _exact_ same time, they should be close enough to be able to calculate
      // high-resolution, monotonically non-decreasing timestamps relative to startTime.
      startTime = new Date().getTime()
      startTimeNow = now()
    }

    if (this._aborted) {
      return
    }

    this._started = true
    this.method = this.method || 'GET'
    this.href = this.uri.href

    if (
      this.src &&
      this.src.stat &&
      this.src.stat.size &&
      !this.hasHeader('content-length')
    ) {
      this.setHeader('content-length', this.src.stat.size)
    }
    if (this._aws) {
      this.aws(this._aws, true)
    }

    // We have a method named auth, which is completely different from the http.request
    // auth option.  If we don't remove it, we're gonna have a bad time.
    const reqOptions = copy(this)
    delete reqOptions.auth

    debug('make request', this.uri.href)

    // node v6.8.0 now supports a `timeout` value in `http.request()`, but we
    // should delete it for now since we handle timeouts manually for better
    // consistency with node versions before v6.8.0
    delete reqOptions.timeout

    try {
      this.req = this.httpModule.request(reqOptions)
    } catch (err) {
      this.emit('error', err)
      return
    }

    if (this.timing) {
      this.startTime = startTime
      this.startTimeNow = startTimeNow

      // Timing values will all be relative to startTime (by comparing to startTimeNow
      // so we have an accurate clock)
      this.timings = {}
    }

    const timeout =
      this.timeout && !this.timeoutTimer
        ? this.timeout < 0
          ? 0
          : this.timeout
        : undefined

    this.req.on('response', this.onRequestResponse.bind(this))
    this.req.on('error', this.onRequestError.bind(this))
    this.req.on('drain', () => this.emit('drain'))

    this.req.on('socket', socket => {
      // `._connecting` was the old property which was made public in node v6.1.0
      const isConnecting = socket._connecting || socket.connecting
      if (this.timing) {
        this.timings.socket = now() - this.startTimeNow

        if (isConnecting) {
          const onLookupTiming = () => {
            this.timings.lookup = now() - this.startTimeNow
          }

          const onConnectTiming = () => {
            this.timings.connect = now() - this.startTimeNow
          }

          socket.once('lookup', onLookupTiming)
          socket.once('connect', onConnectTiming)

          // clean up timing event listeners if needed on error
          this.req.once('error', () => {
            socket.removeListener('lookup', onLookupTiming)
            socket.removeListener('connect', onConnectTiming)
          })
        }
      }

      const setReqTimeout = () => {
        // This timeout sets the amount of time to wait *between* bytes sent
        // from the server once connected.
        //
        // In particular, it's useful for erroring if the server fails to send
        // data halfway through streaming a response.
        this.req.setTimeout(timeout, () => {
          if (this.req) {
            this.abort()
            const e = new Error('ESOCKETTIMEDOUT')
            e.code = 'ESOCKETTIMEDOUT'
            e.connect = false
            this.emit('error', e)
          }
        })
      }
      if (timeout !== undefined) {
        // Only start the connection timer if we're actually connecting a new
        // socket, otherwise if we're already connected (because this is a
        // keep-alive connection) do not bother. This is important since we won't
        // get a 'connect' event for an already connected socket.
        if (isConnecting) {
          const onReqSockConnect = () => {
            socket.removeListener('connect', onReqSockConnect)
            this.clearTimeout()
            setReqTimeout()
          }

          socket.on('connect', onReqSockConnect)

          this.req.on('error', () => {
            // eslint-disable-line handle-callback-err
            socket.removeListener('connect', onReqSockConnect)
          })

          // Set a timeout in memory - this block will throw if the server takes more
          // than `timeout` to write the HTTP status and headers (corresponding to
          // the on('response') event on the client). NB: this measures wall-clock
          // time, not the time between bytes sent by the server.
          this.timeoutTimer = setTimeout(() => {
            socket.removeListener('connect', onReqSockConnect)
            this.abort()
            const e = new Error('ETIMEDOUT')
            e.code = 'ETIMEDOUT'
            e.connect = true
            this.emit('error', e)
          }, timeout)
        } else {
          // We're already connected
          setReqTimeout()
        }
      }
      this.emit('socket', socket)
    })

    this.emit('request', this.req)
  }

  abort () {
    this._aborted = true

    if (this.req) {
      this.req.abort()
    } else if (this.response) {
      this.response.destroy()
    }

    this.clearTimeout()
    this.emit('abort')
  }

  pipeDest (dest) {
    const { response } = this
    // Called after the response is received
    if (dest.headers && !dest.headersSent) {
      if (response.caseless.has('content-type')) {
        const ctname = response.caseless.has('content-type')
        if (dest.setHeader) {
          dest.setHeader(ctname, response.headers[ctname])
        } else {
          dest.headers[ctname] = response.headers[ctname]
        }
      }

      if (response.caseless.has('content-length')) {
        const clname = response.caseless.has('content-length')
        if (dest.setHeader) {
          dest.setHeader(clname, response.headers[clname])
        } else {
          dest.headers[clname] = response.headers[clname]
        }
      }
    }
    if (dest.setHeader && !dest.headersSent) {
      for (const i in response.headers) {
        // If the response content is being decoded, the Content-Encoding header
        // of the response doesn't represent the piped content, so don't pass it.
        if (!this.gzip || i !== 'content-encoding') {
          dest.setHeader(i, response.headers[i])
        }
      }
      dest.statusCode = response.statusCode
    }
    if (this.pipefilter) {
      this.pipefilter(response, dest)
    }
  }

  getHeader (name, headers) {
    let result
    if (!headers) {
      headers = this.headers
    }
    Object.keys(headers).forEach((key) => {
      if (key.length !== name.length) {
        return
      }
      const re = new RegExp(name, 'i')
      const match = key.match(re)
      if (match) {
        result = headers[key]
      }
    })
    return result
  }

  enableUnixSocket () {
    // Get the socket & request paths from the URL
    const [host, path] = this.uri.path.split(':')
    // Apply unix properties to request
    this.socketPath = host
    this.uri.pathname = path
    this.uri.path = path
    this.uri.host = host
    this.uri.hostname = host
    this.uri.isUnix = true
  }

  pipe (dest, opts) {
    if (this.response) {
      if (this._destdata) {
        this.emit('error', new Error('You cannot pipe after data has been emitted from the response.'))
      } else if (this._ended) {
        this.emit('error', new Error('You cannot pipe after the response has been ended.'))
      } else {
        super.pipe(dest, opts)
        this.pipeDest(dest)
        return dest
      }
    } else {
      this.dests.push(dest)
      super.pipe(dest, opts)
      return dest
    }
  }

  write () {
    if (this._aborted) { return }

    if (!this._started) {
      this.start()
    }
    if (this.req) {
      return this.req.write.apply(this.req, arguments)
    }
  }

  end (chunk) {
    if (this._aborted) { return }

    if (chunk) {
      this.write(chunk)
    }
    if (!this._started) {
      this.start()
    }
    if (this.req) {
      this.req.end()
    }
  }

  pause () {
    if (!this.responseContent) {
      this._paused = true
    } else {
      this.responseContent.pause.apply(this.responseContent, arguments)
    }
  }

  resume () {
    if (!this.responseContent) {
      this._paused = false
    } else {
      this.responseContent.resume.apply(this.responseContent, arguments)
    }
  }

  destroy () {
    this.clearTimeout()
    if (!this._ended) {
      this.end()
    } else if (this.response) {
      this.response.destroy()
    }
  }

  clearTimeout () {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
  }

  toJSON () {
    return {
      uri: this.uri,
      method: this.method,
      headers: this.headers
    }
  }

  responseToJSON () {
    return {
      statusCode: this.statusCode,
      body: this.body,
      headers: this.headers,
      request: this.request.toJSON()
    }
  }
}

// Debugging
Request.debug = process.env.NODE_DEBUG && /\brequest\b/.test(process.env.NODE_DEBUG)
function debug () {
  if (Request.debug) {
    console.error('REQUEST %s', util.format.apply(util, arguments))
  }
}

Request.prototype.qs = function (q, clobber) {
  let base
  if (!clobber && this.uri.query) {
    base = this._qs.parse(this.uri.query)
  } else {
    base = {}
  }

  for (const i in q) {
    base[i] = q[i]
  }

  const qs = this._qs.stringify(base)

  if (qs === '') {
    return this
  }

  this.uri = url.parse(this.uri.href.split('?')[0] + '?' + qs)
  this.url = this.uri
  this.path = this.uri.path

  if (this.uri.host === 'unix') {
    this.enableUnixSocket()
  }

  return this
}
Request.prototype.form = function (form) {
  if (form) {
    if (!/^application\/x-www-form-urlencoded\b/.test(this.getHeader('content-type'))) {
      this.setHeader('content-type', 'application/x-www-form-urlencoded')
    }
    this.body = (typeof form === 'string')
      ? this._qs.rfc3986(form.toString('utf8'))
      : this._qs.stringify(form).toString('utf8')
    return this
  }
  // create form-data object
  this._form = new FormData()
  this._form.on('error', err => {
    err.message = 'form-data: ' + err.message
    this.emit('error', err)
    this.abort()
  })
  return this._form
}
Request.prototype.multipart = function (multipart) {
  this._multipart.onRequest(multipart)

  if (!this._multipart.chunked) {
    this.body = this._multipart.body
  }

  return this
}
Request.prototype.json = function (val) {
  if (!this.hasHeader('accept')) {
    this.setHeader('accept', 'application/json')
  }

  if (typeof this.jsonReplacer === 'function') {
    this._jsonReplacer = this.jsonReplacer
  }

  this._json = true
  if (typeof val === 'boolean') {
    if (this.body !== undefined) {
      if (!/^application\/x-www-form-urlencoded\b/.test(this.getHeader('content-type'))) {
        this.body = safeStringify(this.body, this._jsonReplacer)
      } else {
        this.body = this._qs.rfc3986(this.body)
      }
      if (!this.hasHeader('content-type')) {
        this.setHeader('content-type', 'application/json')
      }
    }
  } else {
    this.body = safeStringify(val, this._jsonReplacer)
    if (!this.hasHeader('content-type')) {
      this.setHeader('content-type', 'application/json')
    }
  }

  if (typeof this.jsonReviver === 'function') {
    this._jsonReviver = this.jsonReviver
  }

  return this
}

Request.prototype.auth = function (user, pass, sendImmediately, bearer) {
  this._auth.onRequest(user, pass, sendImmediately, bearer)

  return this
}
Request.prototype.aws = function (opts, now) {
  if (!now) {
    this._aws = opts
    return this
  }

  if (opts.sign_version === 4 || opts.sign_version === '4') {
    // use aws4
    const options = {
      host: this.uri.host,
      path: this.uri.path,
      method: this.method,
      headers: this.headers,
      body: this.body
    }
    if (opts.service) {
      options.service = opts.service
    }
    const signRes = aws4.sign(options, {
      accessKeyId: opts.key,
      secretAccessKey: opts.secret,
      sessionToken: opts.session
    })
    this.setHeader('authorization', signRes.headers.Authorization)
    this.setHeader('x-amz-date', signRes.headers['X-Amz-Date'])
    if (signRes.headers['X-Amz-Security-Token']) {
      this.setHeader('x-amz-security-token', signRes.headers['X-Amz-Security-Token'])
    }
  } else {
    // default: use aws-sign2
    const date = new Date()
    this.setHeader('date', date.toUTCString())
    const auth = {
      key: opts.key,
      secret: opts.secret,
      verb: this.method.toUpperCase(),
      date: date,
      contentType: this.getHeader('content-type') || '',
      md5: this.getHeader('content-md5') || '',
      amazonHeaders: aws2.canonicalizeHeaders(this.headers)
    }
    const path = this.uri.path
    if (opts.bucket && path) {
      auth.resource = '/' + opts.bucket + path
    } else if (opts.bucket && !path) {
      auth.resource = '/' + opts.bucket
    } else if (!opts.bucket && path) {
      auth.resource = path
    } else if (!opts.bucket && !path) {
      auth.resource = '/'
    }
    auth.resource = aws2.canonicalizeResource(auth.resource)
    this.setHeader('authorization', aws2.authorization(auth))
  }

  return this
}
Request.prototype.httpSignature = function (opts) {
  httpSignature.signRequest({
    getHeader: header => this.getHeader(header, this.headers),
    setHeader: (header, value) => { this.setHeader(header, value) },
    method: this.method,
    path: this.path
  }, opts)
  debug('httpSignature authorization', this.getHeader('authorization'))

  return this
}
Request.prototype.hawk = function (opts) {
  this.setHeader('Authorization', hawk.header(this.uri, this.method, opts))
}
Request.prototype.oauth = function (_oauth) {
  this._oauth.onRequest(_oauth)

  return this
}

Request.prototype.jar = function (jar) {
  let cookies

  if (this._redirect.redirectsFollowed === 0) {
    this.originalCookieHeader = this.getHeader('cookie')
  }

  if (!jar) {
    // disable cookies
    cookies = false
    this._disableCookies = true
  } else {
    const targetCookieJar = jar.getCookieString ? jar : globalCookieJar
    const urihref = this.uri.href
    // fetch cookie in the Specified host
    if (targetCookieJar) {
      cookies = targetCookieJar.getCookieString(urihref)
    }
  }

  // if need cookie and cookie is not empty
  if (cookies && cookies.length) {
    if (this.originalCookieHeader) {
      // Don't overwrite existing Cookie header
      this.setHeader('cookie', this.originalCookieHeader + '; ' + cookies)
    } else {
      this.setHeader('cookie', cookies)
    }
  }
  this._jar = jar
  return this
}

Request.defaultProxyHeaderWhiteList =
  Tunnel.defaultProxyHeaderWhiteList.slice()

Request.defaultProxyHeaderExclusiveList =
  Tunnel.defaultProxyHeaderExclusiveList.slice()

// Exports
module.exports = Request
