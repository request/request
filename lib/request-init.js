'use strict'

var http = require('http')
  , https = require('https')
  , url = require('url')
  , mime = require('mime-types')
  , qs = require('qs')
  , querystring = require('querystring')
  , caseless = require('caseless')
  , ForeverAgent = require('forever-agent')
  , extend = require('util')._extend

var copy = require('./copy')
  , getProxyFromURI = require('./getProxyFromURI')
  , helpers = require('./helpers')

var toBase64 = helpers.toBase64
  , defer = helpers.defer
  , isReadStream = helpers.isReadStream

function getTunnelOption(uri, tunnel, options) {
  // Tunnel HTTPS by default, or if a previous request in the redirect chain
  // was tunneled.  Allow the user to override this setting.

  // If self.tunnel is already set (because this is a redirect), use the
  // existing value.
  if (typeof tunnel !== 'undefined') {
    return tunnel
  }

  // If options.tunnel is set (the user specified a value), use it.
  if (typeof options.tunnel !== 'undefined') {
    return options.tunnel
  }

  // If the destination is HTTPS, tunnel.
  if (uri.protocol === 'https:') {
    return true
  }

  // Otherwise, leave tunnel unset, because if a later request in the redirect
  // chain is HTTPS then that request (and any subsequent ones) should be
  // tunneled.
  return undefined
}

function urlToUri(uri, url) {
  if (!uri && url) {
    uri = url
  }

  return uri
}

function getPort(uri) {
  var port

  if (uri.protocol === 'http:') {
    port = 80
  } else if (uri.protocol === 'https:') {
    port = 443
  }

  return port
}

function getUriObject(uri) {
  if (typeof uri === 'string') {
    uri = url.parse(uri)
  }

  if (uri && !uri.pathname) {
    uri.pathname = '/'
  }
  
  return uri
}

function getContentType(self, src) {
  var contentType = self.getHeader('content-type')

  if (isReadStream(src)) {
    contentType = mime.lookup(src.path)
  }

  if (self._json) {
    contentType = 'application/json'
  }

  return contentType
}


function setupCallback(self) {
  if (self._callback || !self.callback) {
    return
  }

  // Protect against double callback
  self._callback = self.callback
  self.callback = function () {
    if (self._callbackCalled) {
      return // Print a warning maybe?
    }
    self._callbackCalled = true
    self._callback.apply(self, arguments)
  }
  self.on('error', self.callback.bind())
  self.on('complete', self.callback.bind(self, null))
}

function uriErrors(uri) {
  var props = {}

  if (!uri) {
    props.error = new Error('options.uri is a required argument')
  }
  
  if (uri && uri.protocol === 'unix:') {
    props.error = new Error('`unix://` URL scheme is no longer supported. Please use the format `http://unix:SOCKET:PATH`')
  }

  return props
}

function handleBaseUrl(path, baseUrl) {
  // If there's a baseUrl, then use it as the base URL (i.e. uri must be
  // specified as a relative path and is appended to baseUrl).
  var props = {}
  var uri

  if (!baseUrl) {
    return props
  }

  if (typeof baseUrl !== 'string') {
    props.error = new Error('options.baseUrl must be a string')
    return props
  }

  if (typeof path !== 'string') {
    props.error = new Error('options.uri must be a string when using options.baseUrl')
    return props
  }

  if (path.indexOf('//') === 0 || path.indexOf('://') !== -1) {
    props.error = new Error('options.uri must be a path when using options.baseUrl')
    return props
  }

  // Handle all cases to make sure that there's only one slash between
  // baseUrl and uri.
  var baseUrlEndsWithSlash = baseUrl.lastIndexOf('/') === baseUrl.length - 1
  var uriStartsWithSlash = path.indexOf('/') === 0

  if (baseUrlEndsWithSlash && uriStartsWithSlash) {
    uri = baseUrl + path.slice(1)
    props.uri = getUriObject(uri)
  } else if (baseUrlEndsWithSlash || uriStartsWithSlash) {
    uri = baseUrl + path
    props.uri = getUriObject(uri)
  } else if (path === '') {
    uri = baseUrl
    props.uri = getUriObject(uri)
  } else {
    uri = baseUrl + '/' + path
    props.uri = getUriObject(uri)
  }

  return props
}

function unixSocketSupport(uri) {
  var props = {}

  if (uri.host === 'unix') {
    var unixParts = uri.path.split(':')
      , host = unixParts[0]
      , path = unixParts[1]

    var uriProps = {
      pathname: path,
      path: path,
      host: host,
      hostname: host,
      isUnix: true
    }
    
    props.uri = uriProps
    props.socketPath = host
  }

  return props
}

function invalidUri(uri, options) {
  var props = {}

  if (!(uri.host || (uri.hostname && uri.port)) && !uri.isUnix) {
    // Invalid URI: it may generate lot of bad errors, like 'TypeError: Cannot call method `indexOf` of undefined' in CookieJar
    // Detect and reject it as soon as possible

    var faultyUri = url.format(uri)
    var message = 'Invalid URI "' + faultyUri + '"'
    if (Object.keys(options).length === 0) {
      // No option ? This can be the sign of a redirect
      // As this is a case where the user cannot do anything (they didn't call request directly with this URL)
      // they should be warned that it can be caused by a redirection (can save some hair)
      message += '. This can be caused by a crappy redirection.'
    }

    // This error was fatal
    props.error = new Error(message)
  }

  return props
}

function formData(self, formData) {
  var requestForm = self.form()
  var appendFormValue = function (key, value) {
    if (value.hasOwnProperty('value') && value.hasOwnProperty('options')) {
      requestForm.append(key, value.value, value.options)
    } else {
      requestForm.append(key, value)
    }
  }
  for (var formKey in formData) {
    if (formData.hasOwnProperty(formKey)) {
      var formValue = formData[formKey]
      if (formValue instanceof Array) {
        for (var j = 0; j < formValue.length; j++) {
          appendFormValue(formKey, formValue[j])
        }
      } else {
        appendFormValue(formKey, formValue)
      }
    }
  }
}

function onPipe(src) {
  var self = this

  if (self.ntick && self._started) {
    throw new Error('You cannot pipe to this stream after the outbound request has started.')
  }

  self.src = src
  var readStream = isReadStream(src)
  var hasContentTypeHeader = self.hasHeader('content-type')
  var contentType = getContentType(self, src)

  if (contentType && !hasContentTypeHeader) {
    self.setHeader('content-type', contentType)
  }
   
  if (!readStream && !hasContentTypeHeader && src.method && !self.explicitMethod) {
    self.method = src.method
  }

  if (!readStream && src.headers) {
    for (var i in src.headers) {
      if (!self.hasHeader(i)) {
        self.setHeader(i, src.headers[i])
      }
    }
  }

  // self.on('pipe', function () {
  //   console.error('You have already piped to this stream. Pipeing twice is likely to break the request.')
  // })
}

function onEnd() {
  var self = this

  if (self._form) {
    self._form.pipe(self)
  }

  if (self._multipart && self._multipart.chunked) {
    self._multipart.body.pipe(self)
  }

  if (self.body) {
    if (Array.isArray(self.body)) {
      self.body.forEach(function (part) {
        self.write(part)
      })
    } else {
      self.write(self.body)
    }

    self.end()
    return
  }
  
  if (!self.src) {
    var hasNonGetMethod = (self.method !== 'GET' && typeof self.method !== 'undefined')
    if (hasNonGetMethod) {
      self.setHeader('content-length', 0)
    }

    self.end()
    return
  }

  if (self.requestBodyStream) {
    console.warn('options.requestBodyStream is deprecated, please pass the request object to stream.pipe.')
    self.requestBodyStream.pipe(self)
  }
}

function deferred() {
  var self = this
  var end = onEnd.bind(self)
  self.ntick = true

  if (self._aborted) {
    return
  }

  if (!self._form || self.hasHeader('content-length')) {
    end()
    return
  }

  // Before ending the request, we had to compute the length of the whole form, asyncly
  self.setHeader(self._form.getHeaders())
  self._form.getLength(function(err, length) {
    if (!err) {
      self.setHeader('content-length', length)
    }
    end()
  })  
}

function getPath(uri) {
  var path = uri.path

  if (!path) {
    path = uri.pathname + (uri.search || '')
  }

  if (path.length === 0) {
    path = '/'
  }

  return path
}

function getProxy(self, uri) {
  var proxy = self.proxy

  if (!self.hasOwnProperty('proxy')) {
    proxy = getProxyFromURI(uri)
  }
  
  if (typeof proxy === 'string') {
    proxy = url.parse(proxy)
  }

  return proxy
}

function getAgentClass(defaultAgent, protocol, options) {
  var agentClass = defaultAgent
 
  if (options.agentClass) {
    agentClass = options.agentClass
  }
  
  if (options.forever && !options.agentClass) {
    agentClass = protocol === 'http:' ? ForeverAgent : ForeverAgent.SSL
  }

  return agentClass
}

function getBodyLength(body, options) {
  var bodyIsArray = Array.isArray(body)
  var bodyIsBuffer = Buffer.isBuffer(body)
  var length

  if (!bodyIsBuffer && !bodyIsArray) {
    body = new Buffer(body)
    length = body.length
  }

  if (bodyIsBuffer) {
    length = body.length
  }
  
  if (bodyIsArray) {
    length = body.reduce(function(x, y) {
      return x + y.length
    }, 0)
  }
  
  return length
}

function getHostNames(self, uri) {
  var results = []
  var hostHeaderName = self.originalHostHeaderName || 'host'
  var withHttp = (uri.port === 80 && uri.protocol === 'http:')
  var withHttps = (uri.port === 443 && uri.protocol === 'https:')
  var hostname = uri.hostname
  var names = {
    hostHeaderName: hostHeaderName,
    hostname: hostname
  }

  results.push(names)

  if (uri.port && !withHttp && !withHttps) {
    hostname = hostname + (':' + uri.port)
    results.push({hostname: hostname, hostHeaderName: hostHeaderName})
  }

  return results
}

// init() contains all the code to setup the request object.
// the actual outgoing request is not started until start() is called
// this function is called from both the constructor and on redirect.

function initRequest(options, extras) {
  var self = this
  var globalPool = extras.globalPool
  options = options || {}

  // Setup Initial Values
  var initialUri = urlToUri(self.uri, self.url)
  var uri = getUriObject(initialUri)
  var method = self.method || options.method || 'GET'
  var localAddress = self.localAddress || options.localAddress
  var headers = self.headers ? copy(self.headers) : {}
  var qsLib = self.qsLib || (options.useQuerystring ? querystring : qs)
  var poolNotSpecified = (!self.pool && self.pool !== false)
  var pool = poolNotSpecified ? globalPool : self.pool
  var dests = self.dests || []
  var setHost = false
  var __isRequestRequest = true
  
  // Setup Callback Function
  // This needs to happen before Error Handling.
  setupCallback(self)
  caseless.httpify(self, headers)

  // Handle Uri Errors
  var uriError = uriErrors(uri).error
  if (uriError) {
    return self.emit('error', uriError)
  }
 
  // Support BaseUrl Option
  var baseUrlProps = handleBaseUrl(initialUri, self.baseUrl)
  if (baseUrlProps.error) {
    return self.emit('error', baseUrlProps.error)
  }
  uri = extend(uri, baseUrlProps.uri)
  
  // Support Unix Sockets
  var unixSocketProps = unixSocketSupport(uri)
  uri = extend(uri, unixSocketProps.uri)
  var socketPath = unixSocketProps.socketPath

  // Handle Invalid URI
  var invalidUriError = invalidUri(uri, options).error
  if (invalidUriError) {
    return self.emit('error', invalidUriError)
  }

  // Setup Host, Path, Port, Tunel, and Proxy
  var host = uri.hostname
  var path = getPath(uri)
  var port = uri.port || getPort(uri) 
  var tunnel = getTunnelOption(uri, self.tunnel, options)
  var proxy = getProxy(self, uri)
  
  if (proxy && !tunnel) {
    host = proxy.hostname
    path = (uri.protocol + '//' + uri.host + path)
    port = proxy.port
  }

  // Setup Protocol and HTTP Modules
  var protocol = proxy && !tunnel ? proxy.protocol : uri.protocol
  var defaultModules = {'http:':http, 'https:':https}
  var httpModules = self.httpModules || {}

  // Handle Invalid Protocol Error
  var httpModule = httpModules[protocol] || defaultModules[protocol]
  if (!httpModule) {
    return self.emit('error', new Error('Invalid protocol: ' + protocol))
  }
 
  // Support Strict SSL
  var rejectUnauthorized = self.rejectUnauthorized
  if (self.strictSSL === false) {
    rejectUnauthorized = false
  }
  
  // Set Host Header
  if (!self.hasHeader('host')) {
    setHost = true
    var hostNamePairs = getHostNames(self, uri)
    hostNamePairs.forEach(function(names) {
      self.setHeader(names.hostHeaderName, names.hostname)
    })
  }

  // Set CA
  if (options.ca) {
    self.ca = options.ca
  }

  // Support GZIP
  if (self.gzip && !self.hasHeader('accept-encoding')) {
    self.setHeader('accept-encoding', 'gzip')
  }

  // Set our initial values on the Request
  self.uri = uri
  self.host = host
  self.path = path
  self.port = port
  self.proxy = proxy
  self.tunnel = tunnel
  self.headers = headers
  self.method = method
  self.localAddress = localAddress
  self.socketPath = socketPath
  self.pool = pool
  self.qsLib = qsLib
  self.dests = dests
  self.httpModule = httpModule
  self.rejectUnauthorized = rejectUnauthorized
  self.setHost = setHost
  self.__isRequestRequest = __isRequestRequest

  // Clean up unneeded state
  if (self.baseUrl) {
    delete self.baseUrl
  }

  if (self.url) {
    delete self.url
  }
  
  // Configure Jar with Default or Custom
  self.jar(self._jar || options.jar)

  // Handle Redirects
  self._redirect.onRequest()

  // Support Proxies
  if (proxy) {
    self.setupTunnel()
  }
  
  // Support Custom Agent Options
  // May not need this
  if (!self.agent && options.agentOptions) {
    self.agentOptions = options.agentOptions
  }
  
  // Set Agent Class
  var defaultAgent = self.httpModule.Agent
  self.agentClass = getAgentClass(defaultAgent, protocol, options)
  
  if (self.pool === false) {
    self.agent = false
  } else {
    self.agent = self.agent || self.getNewAgent()
  }

  // Support Form
  if (options.form) {
    self.form(options.form)
  }

  // Support FormData
  if (options.formData) {
    formData(self, options.formData)
  }

  // Support JSON
  if (options.json) {
    self.json(options.json)
  }

  // Support Multipart Forms
  if (options.multipart) {
    self.multipart(options.multipart)
  }

  // Support Custom QueryString Lib
  if (options.qs) {
    self.qs(options.qs)
    uri = self.uri
  }

  // Support Timing Request
  if (options.time) {
    self.timing = true
    self.elapsedTime = self.elapsedTime || 0
  }
  
  // Set Content Length from Body
  if (self.body) {
    var length = getBodyLength(self.body, options)

    if (!length) {
      throw new Error('Argument error, options.body.')
    }

    if (!self.hasHeader('content-length')) {
      self.setHeader('content-length', length)
    }
  }

  // Auth
  // This section is last because signing can be dependent on other headers.

  // Support OAUTH  
  if (options.oauth) {
    self.oauth(options.oauth)
  }

  // Support AWS
  if (options.aws) {
    self.aws(options.aws)
  }

  // Support HAWK
  if (options.hawk) {
    self.hawk(options.hawk)
  }

  // Support HTTP Signature
  if (options.httpSignature) {
    self.httpSignature(options.httpSignature)
  }

  // Support Basic Auth
  if (options.auth) {
    if (Object.prototype.hasOwnProperty.call(options.auth, 'username')) {
      options.auth.user = options.auth.username
    }
    if (Object.prototype.hasOwnProperty.call(options.auth, 'password')) {
      options.auth.pass = options.auth.password
    }

    self.auth(
      options.auth.user,
      options.auth.pass,
      options.auth.sendImmediately,
      options.auth.bearer
    )
  }

  if (self.uri.auth && !self.hasHeader('authorization')) {
    var uriAuthPieces = self.uri.auth.split(':').map(function(item){ return querystring.unescape(item) })
    self.auth(uriAuthPieces[0], uriAuthPieces.slice(1).join(':'), true)
  }

  if (!self.tunnel && self.proxy && self.proxy.auth && !self.hasHeader('proxy-authorization')) {
    var proxyAuthPieces = self.proxy.auth.split(':').map(function(item){
      return querystring.unescape(item)
    })
    var authHeader = 'Basic ' + toBase64(proxyAuthPieces.join(':'))
    self.setHeader('proxy-authorization', authHeader)
  }

  // Setup Piping and Deferred Callbacks
  self.on('pipe', onPipe.bind(self))
  defer(deferred.bind(self))
}

module.exports = initRequest
