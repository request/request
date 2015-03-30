// Copyright 2010-2012 Mikeal Rogers
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

'use strict'

var extend                = require('util')._extend
  , cookies               = require('./lib/cookies')
  , helpers               = require('./lib/helpers')

var isFunction            = helpers.isFunction
  , paramsHaveRequestBody = helpers.paramsHaveRequestBody


// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
  if (typeof options === 'function') {
    callback = options
  }

  var params
  if (typeof options === 'object') {
    params = extend({}, options)
    params = extend(params, {uri: uri})
  } else if (typeof uri === 'string') {
    params = extend({}, {uri: uri})
  } else {
    params = extend({}, uri)
  }

  return {
    uri: params.uri,
    options: params,
    callback: callback
  }
}

function request (uri, options, callback) {
  if (typeof uri === 'undefined') {
    throw new Error('undefined is not a valid uri or options object.')
  }

  var params = initParams(uri, options, callback)
  options = params.options
  options.callback = params.callback
  options.uri = params.uri

  if (params.options.method === 'HEAD' && paramsHaveRequestBody(params)) {
    throw new Error('HTTP HEAD requests MUST NOT include a request body.')
  }

  return new request.Request(options)
}

var verbs = ['get', 'head', 'post', 'put', 'patch', 'del']

verbs.forEach(function(verb) {
  var method = verb === 'del' ? 'DELETE' : verb.toUpperCase()
  request[verb] = function (uri, options, callback) {
    var params = initParams(uri, options, callback)
    params.options.method = method
    return (this || request)(params.uri || null, params.options, params.callback)
  }
})

request.jar = function (store) {
  return cookies.jar(store)
}

request.cookie = function (str) {
  return cookies.parse(str)
}

function wrap (method, options, requester) {

  return function (uri, opts, callback) {
    var params = initParams(uri, opts, callback)

    var headerlessOptions = extend({}, options)
    delete headerlessOptions.headers
    params.options = extend(headerlessOptions, params.options)

    if (typeof method === 'string') {
      params.options.method = (method === 'del' ? 'DELETE' : method.toUpperCase())
      method = request[method]
    }

    if (options.headers) {
      var headers = extend({}, options.headers)
      params.options.headers = extend(headers, params.options.headers)
    }

    if (isFunction(requester)) {
      method = requester
    }

    return method(params.options, params.callback)
  }
}

request.defaults = function (options, requester) {
  var self = this

  if (typeof options === 'function') {
    requester = options
    options = {}
  }

  var defaults      = wrap(self, options, requester)

  var verbs = ['get', 'head', 'post', 'put', 'patch', 'del']
  verbs.forEach(function(verb) {
    defaults[verb]  = wrap(verb, options, requester)
  })

  defaults.cookie   = wrap(self.cookie, options, requester)
  defaults.jar      = self.jar
  defaults.defaults = self.defaults
  return defaults
}

request.forever = function (agentOptions, optionsArg) {
  var options = {}
  if (optionsArg) {
    options = extend({}, optionsArg)
  }
  if (agentOptions) {
    options.agentOptions = agentOptions
  }

  options = extend(options, {forever: true})
  return request.defaults(options)
}

// Exports

module.exports = request
request.Request = require('./request')
request.initParams = initParams

// Backwards compatibility for request.debug
Object.defineProperty(request, 'debug', {
  enumerable : true,
  get : function() {
    return request.Request.debug
  },
  set : function(debug) {
    request.Request.debug = debug
  }
})
