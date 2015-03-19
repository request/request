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
  , constructObject = helpers.constructObject

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

function getUriObject(uri) {
  if(typeof uri === 'string') {
    uri = url.parse(uri)
  }

  if (uri && !uri.pathname) {
    uri.pathname = '/'
  }
  
  return uri
}

function handleBaseUrl(path, baseUrl) {
  // If there's a baseUrl, then use it as the base URL (i.e. uri must be
  // specified as a relative path and is appended to baseUrl).
  var props = {}
  var uri

  if (baseUrl) {
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
  }

  return props
}

function setupCallback(self) {
  // Protect against double callback
  if (!self._callback && self.callback) {
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
}

function unixSocketSupport(uri) {
  var props = {}

  if(uri.host === 'unix') {
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

function getPort(uri) {
  var port

  if (uri.protocol === 'http:') {
    port = 80
  } else if (uri.protocol === 'https:') {
    port = 443
  }

  return port
}

function uriErrors(uri) {
  var props = {}

  if(!uri) {
    props.error = new Error('options.uri is a required argument')
  }
  
  if(uri && uri.protocol === 'unix:') {
    prop.error = new Error('`unix://` URL scheme is no longer supported. Please use the format `http://unix:SOCKET:PATH`')
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
    var error = new Error(message)
    props.error = error
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

  if (isReadStream(src)) {
    if (!self.hasHeader('content-type')) {
      self.setHeader('content-type', mime.lookup(src.path))
    }
  } else {
    if (src.headers) {
      for (var i in src.headers) {
        if (!self.hasHeader(i)) {
          self.setHeader(i, src.headers[i])
        }
      }
    }

    if (self._json && !self.hasHeader('content-type')) {
      self.setHeader('content-type', 'application/json')
    }

    if (src.method && !self.explicitMethod) {
      self.method = src.method
    }
  }

  // self.on('pipe', function () {
  //   console.error('You have already piped to this stream. Pipeing twice is likely to break the request.')
  // })
}

function deferred() {
  var self = this

  if (self._aborted) {
    return
  }

  var end = function () {
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
    } else if (self.requestBodyStream) {
      console.warn('options.requestBodyStream is deprecated, please pass the request object to stream.pipe.')
      self.requestBodyStream.pipe(self)
    } else if (!self.src) {
      if (self.method !== 'GET' && typeof self.method !== 'undefined') {
        self.setHeader('content-length', 0)
      }
      self.end()
    }
  }

  if (self._form && !self.hasHeader('content-length')) {
    // Before ending the request, we had to compute the length of the whole form, asyncly
    self.setHeader(self._form.getHeaders())
    self._form.getLength(function (err, length) {
      if (!err) {
        self.setHeader('content-length', length)
      }
      end()
    })
  } else {
    end()
  }

  self.ntick = true
}

function initRequest(options, extras) {
  // init() contains all the code to setup the request object.
  // the actual outgoing request is not started until start() is called
  // this function is called from both the constructor and on redirect.

  var self = this
  var globalPool = extras.globalPool
  options = options || {}
  setupCallback(self)

  var selfProps = constructObject(self)
  var props = constructObject({})
  var initialUri = urlToUri(self.uri, self.url)
  var uri = getUriObject(initialUri)
  
  var uriError = uriErrors(uri).error
  if(uriError) {
    return self.emit('error', uriError)
  }
  
  // Support Unix Sockets
  var unixSocketProps = unixSocketSupport(uri)
  uri = constructObject(uri).extend(unixSocketProps.uri).done()
  props.extend({
    socketPath: unixSocketProps.socketPath,
    uri: uri
  })
  
  // Handle BaseUrl option
  var baseUrlProps = handleBaseUrl(initialUri, self.baseUrl)
  if(baseUrlProps.error) {
    return self.emit('error', baseUrlProps.error)
  }
  
  // set latest URI manually for now
  props.extend(baseUrlProps)
  uri = props.done().uri

  // Cleanup
  if(self.baseUrl) {
    delete self.baseUrl
  }
  if(self.url) {
    delete self.url
  }

  // Handle Invalid URI
  var invalidUriError = invalidUri(uri, options).error
  if(invalidUriError) {
    return self.emit('error', invalidUriError)
  } 
   
  var proxy = self.proxy
  if(!self.hasOwnProperty('proxy')) {
    proxy = getProxyFromURI(uri)
  }
  
  var method = self.method || options.method || 'GET'
  var requestHeaders = self.headers
  var headers = requestHeaders ? copy(requestHeaders) : {}
  
  var localAddress = self.localAddress || options.localAddress
  var qsLib = self.qsLib || (options.useQuerystring ? querystring : qs)

  var poolNotSpecified = (!self.pool && self.pool !== false)
  var pool = poolNotSpecified ? globalPool : self.pool
  var dests = self.dests || []
  var __isRequestRequest = true

  var port = uri.port || getPort(uri)
 
  var rejectUnauthorized = self.rejectUnauthorized
  if (self.strictSSL === false) {
    rejectUnauthorized = false
  }
   
  props.extend({
    proxy: proxy,
    headers: headers,
    port: port,
    method: method,
    localAddress: localAddress,
    pool: pool,
    qsLib: qsLib,
    dests: dests,
    rejectUnauthorized: rejectUnauthorized,
    __isRequestRequest: __isRequestRequest
  })

  selfProps.extend(props.done())
  caseless.httpify(self, self.headers)
  
  var tunnel = getTunnelOption(uri, self.tunnel, options)
  self.tunnel = tunnel
  if (self.proxy) {
    self.setupTunnel()
  }

  if (proxy && !self.tunnel) {
    self.port = self.proxy.port
    self.host = self.proxy.hostname
  } else {
    self.port = self.uri.port
    self.host = self.uri.hostname
  }
 
  self.setHost = false
  if (!self.hasHeader('host')) {
    var hostHeaderName = self.originalHostHeaderName || 'host'
    self.setHeader(hostHeaderName, self.uri.hostname)
    if (self.uri.port) {
      if ( !(self.uri.port === 80 && self.uri.protocol === 'http:') &&
           !(self.uri.port === 443 && self.uri.protocol === 'https:') ) {
        self.setHeader(hostHeaderName, self.getHeader('host') + (':' + self.uri.port) )
      }
    }
    self.setHost = true
  }

  self.jar(self._jar || options.jar)
  self._redirect.onRequest()

  if (options.form) {
    self.form(options.form)
  }

  if (options.formData) {
    formData(self, options.formData)
  }

  if (options.qs) {
    self.qs(options.qs)
  }

  if (self.uri.path) {
    self.path = self.uri.path
  } else {
    self.path = self.uri.pathname + (self.uri.search || '')
  }

  if (self.path.length === 0) {
    self.path = '/'
  }
  
  if (self.proxy && !self.tunnel) {
    self.path = (self.uri.protocol + '//' + self.uri.host + self.path)
  }

  if (options.json) {
    self.json(options.json)
  }
  if (options.multipart) {
    self.multipart(options.multipart)
  }

  if (options.time) {
    self.timing = true
    self.elapsedTime = self.elapsedTime || 0
  }

  // Auth must happen last in case signing is dependent on other headers
  if (options.oauth) {
    self.oauth(options.oauth)
  }

  if (options.aws) {
    self.aws(options.aws)
  }

  if (options.hawk) {
    self.hawk(options.hawk)
  }

  if (options.httpSignature) {
    self.httpSignature(options.httpSignature)
  }

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

  if (self.gzip && !self.hasHeader('accept-encoding')) {
    self.setHeader('accept-encoding', 'gzip')
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

  if (self.body) {
    var length = 0
    if (!Buffer.isBuffer(self.body)) {
      if (Array.isArray(self.body)) {
        for (var i = 0; i < self.body.length; i++) {
          length += self.body[i].length
        }
      } else {
        self.body = new Buffer(self.body)
        length = self.body.length
      }
    } else {
      length = self.body.length
    }
    if (length) {
      if (!self.hasHeader('content-length')) {
        self.setHeader('content-length', length)
      }
    } else {
      throw new Error('Argument error, options.body.')
    }
  }

  var protocol = self.proxy && !self.tunnel ? self.proxy.protocol : self.uri.protocol
    , defaultModules = {'http:':http, 'https:':https}
    , httpModules = self.httpModules || {}

  self.httpModule = httpModules[protocol] || defaultModules[protocol]

  if (!self.httpModule) {
    return self.emit('error', new Error('Invalid protocol: ' + protocol))
  }

  if (options.ca) {
    self.ca = options.ca
  }

  if (!self.agent) {
    if (options.agentOptions) {
      self.agentOptions = options.agentOptions
    }

    if (options.agentClass) {
      self.agentClass = options.agentClass
    } else if (options.forever) {
      self.agentClass = protocol === 'http:' ? ForeverAgent : ForeverAgent.SSL
    } else {
      self.agentClass = self.httpModule.Agent
    }
  }

  if (self.pool === false) {
    self.agent = false
  } else {
    self.agent = self.agent || self.getNewAgent()
  }

  self.on('pipe', onPipe.bind(self))
  defer(deferred.bind(self))
}

module.exports = initRequest
