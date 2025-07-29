'use strict'

var { SocksProxyAgent } = require('socks-proxy-agent')

var ALLOWED_PROTOCOLS = ['socks4:', 'socks4a:', 'socks5:', 'socks5h:', 'socks:']

function SocksProxy (request) {
  this.request = request
}

SocksProxy.prototype.isEnabled = function () {
  var self = this
  var request = self.request

  if (typeof request.proxy === 'string') {
    request.proxy = request.urlParser.parse(request.proxy)
  }

  if (!request.proxy) {
    return false
  }
  
  return request.proxy.href && ALLOWED_PROTOCOLS.includes(request.proxy.protocol)
}

SocksProxy.prototype.setup = function () {
  var self = this
  var request = self.request
  
  if (!self.isEnabled()) {
    return false
  }

  var proxyUrl = request.proxy.href
  
  // Handle authentication from proxy.auth if not already in URL
  if (request.proxy.auth && proxyUrl.indexOf('@') === -1) {
    proxyUrl =  request.proxy.protocol + '//' + request.proxy.auth + '@' +  request.proxy.host
  }
  
  request.agent = new SocksProxyAgent(proxyUrl)

  return true
}

exports.SocksProxy = SocksProxy 