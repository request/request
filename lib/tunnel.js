'use strict'

const url = require('url')
const tunnel = require('tunnel-agent')

function constructProxyHost (uriObject) {
  const { port, protocol } = uriObject
  let proxyHost = uriObject.hostname + ':'

  if (port) {
    proxyHost += port
  } else if (protocol === 'https:') {
    proxyHost += '443'
  } else {
    proxyHost += '80'
  }

  return proxyHost
}

function constructProxyHeaderWhiteList (headers, proxyHeaderWhiteList) {
  const whiteList = proxyHeaderWhiteList.reduce((set, header) => {
    set[header.toLowerCase()] = true
    return set
  }, {})

  return Object.keys(headers)
    .filter(header => whiteList[header.toLowerCase()])
    .reduce((set, header) => {
      set[header] = headers[header]
      return set
    }, {})
}

function constructTunnelOptions (request, proxyHeaders) {
  const { proxy } = request

  return {
    proxy: {
      host: proxy.hostname,
      port: +proxy.port,
      proxyAuth: proxy.auth,
      headers: proxyHeaders
    },
    headers: request.headers,
    ca: request.ca,
    cert: request.cert,
    key: request.key,
    passphrase: request.passphrase,
    pfx: request.pfx,
    ciphers: request.ciphers,
    rejectUnauthorized: request.rejectUnauthorized,
    secureOptions: request.secureOptions,
    secureProtocol: request.secureProtocol
  }
}

function constructTunnelFnName (uri, proxy) {
  const uriProtocol = uri.protocol === 'https:' ? 'https' : 'http'
  const proxyProtocol = proxy.protocol === 'https:' ? 'Https' : 'Http'
  return [uriProtocol, proxyProtocol].join('Over')
}

function getTunnelFn (request) {
  const { uri, proxy } = request
  return tunnel[constructTunnelFnName(uri, proxy)]
}

class Tunnel {
  constructor (request) {
    this.request = request
    this.proxyHeaderWhiteList = Tunnel.defaultProxyHeaderWhiteList
    this.proxyHeaderExclusiveList = []
    if (typeof request.tunnel !== 'undefined') {
      this.tunnelOverride = request.tunnel
    }
  }

  isEnabled () {
    const { request } = this
    // Tunnel HTTPS by default. Allow the user to override this setting.

    // If this.tunnelOverride is set (the user specified a value), use it.
    if (typeof this.tunnelOverride !== 'undefined') {
      return this.tunnelOverride
    }

    // If the destination is HTTPS, tunnel.
    if (request.uri.protocol === 'https:') {
      return true
    }

    // Otherwise, do not use tunnel.
    return false
  }

  setup (options) {
    const { request } = this

    options = options || {}

    if (typeof request.proxy === 'string') {
      request.proxy = url.parse(request.proxy)
    }

    if (!request.proxy || !request.tunnel) {
      return false
    }

    // Setup Proxy Header Exclusive List and White List
    if (options.proxyHeaderWhiteList) {
      this.proxyHeaderWhiteList = options.proxyHeaderWhiteList
    }
    if (options.proxyHeaderExclusiveList) {
      this.proxyHeaderExclusiveList = options.proxyHeaderExclusiveList
    }

    const proxyHeaderExclusiveList = this.proxyHeaderExclusiveList.concat(
      Tunnel.defaultProxyHeaderExclusiveList
    )
    const proxyHeaderWhiteList = this.proxyHeaderWhiteList.concat(
      proxyHeaderExclusiveList
    )

    // Setup Proxy Headers and Proxy Headers Host
    // Only send the Proxy White Listed Header names
    const proxyHeaders = constructProxyHeaderWhiteList(
      request.headers,
      proxyHeaderWhiteList
    )
    proxyHeaders.host = constructProxyHost(request.uri)

    proxyHeaderExclusiveList.forEach(request.removeHeader, request)

    // Set Agent from Tunnel Data
    const tunnelFn = getTunnelFn(request)
    const tunnelOptions = constructTunnelOptions(request, proxyHeaders)
    request.agent = tunnelFn(tunnelOptions)

    return true
  }
}

Tunnel.defaultProxyHeaderWhiteList = [
  'accept',
  'accept-charset',
  'accept-encoding',
  'accept-language',
  'accept-ranges',
  'cache-control',
  'content-encoding',
  'content-language',
  'content-location',
  'content-md5',
  'content-range',
  'content-type',
  'connection',
  'date',
  'expect',
  'max-forwards',
  'pragma',
  'referer',
  'te',
  'user-agent',
  'via'
]
Tunnel.defaultProxyHeaderExclusiveList = ['proxy-authorization']

module.exports = { Tunnel }
