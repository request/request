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

var tls = require('tls')
var extend = require('extend')
var cookies = require('./lib/cookies')

// organize params for patch, post, put, head, del
function initParams (uri, options, callback) {
  if (typeof options === 'function') {
    callback = options
  }

  var params = {}
  if (options !== null && typeof options === 'object') {
    extend(params, options, {uri: uri})
  } else if (typeof uri === 'string') {
    extend(params, {uri: uri})
  } else {
    extend(params, uri)
  }

  params.callback = callback || params.callback
  return params
}

function request (uri, options, callback) {
  if (typeof uri === 'undefined') {
    throw new Error('undefined is not a valid uri or options object.')
  }

  var params = initParams(uri, options, callback)

  return new request.Request(params)
}

function verbFunc (verb) {
  var method = verb.toUpperCase()
  return function (uri, options, callback) {
    var params = initParams(uri, options, callback)
    params.method = method
    return request(params, params.callback)
  }
}

// define like this to please codeintel/intellisense IDEs
request.get = verbFunc('get')
request.head = verbFunc('head')
request.options = verbFunc('options')
request.post = verbFunc('post')
request.put = verbFunc('put')
request.patch = verbFunc('patch')
request.del = verbFunc('delete')
request['delete'] = verbFunc('delete')

request.jar = function (store) {
  return cookies.jar(store)
}

request.cookie = function (str) {
  return cookies.parse(str)
}

function wrapRequestMethod (method, options, requester, verb) {
  return function (uri, opts, callback) {
    var params = initParams(uri, opts, callback)

    var target = {}
    extend(true, target, options, params)

    target.pool = params.pool || options.pool

    if (verb) {
      target.method = verb.toUpperCase()
    }

    if (typeof requester === 'function') {
      method = requester
    }

    return method(target, target.callback)
  }
}

request.defaults = function (options, requester) {
  var self = this

  options = options || {}

  if (typeof options === 'function') {
    requester = options
    options = {}
  }

  var defaults = wrapRequestMethod(self, options, requester)

  var verbs = ['get', 'head', 'post', 'put', 'patch', 'del', 'delete']
  verbs.forEach(function (verb) {
    defaults[verb] = wrapRequestMethod(self[verb], options, requester, verb)
  })

  defaults.cookie = wrapRequestMethod(self.cookie, options, requester)
  defaults.jar = self.jar
  defaults.defaults = self.defaults
  return defaults
}

request.forever = function (agentOptions, optionsArg) {
  var options = {}
  if (optionsArg) {
    extend(options, optionsArg)
  }
  if (agentOptions) {
    options.agentOptions = agentOptions
  }

  options.forever = true
  return request.defaults(options)
}

// As of now (Node v10.x LTS), the only way to extend the well known "root" CA
// is by using an environment variable called `NODE_EXTRA_CA_CERTS`.
// This function enables the same functionality and provides a programmatic way
// to extend the CA certificates.
// Refer: https://nodejs.org/docs/latest-v10.x/api/cli.html#cli_node_extra_ca_certs_file
//
// @note Unlike NODE_EXTRA_CA_CERTS, this method extends the CA for every
// request sent and since its an expensive operation its advised to use a
// keepAlive agent(agentOptions.keepAlive: true) when this is enabled.
//
//   Benchmarks using a local server:
//     NODE_EXTRA_CA_CERTS (keepAlive: false) : 422 ops/sec ±1.73% (77 runs sampled)
//     NODE_EXTRA_CA_CERTS (keepAlive: true)  : 2,096 ops/sec ±4.23% (69 runs sampled)
//
//     enableNodeExtraCACerts (keepAlive: false) : 331 ops/sec ±5.64% (77 runs sampled)
//     enableNodeExtraCACerts (keepAlive: true)  : 2,045 ops/sec ±5.20% (69 runs sampled)
//
// @note Enabling this will override the singleton `tls.createSecureContext` method
// which will be affected for every request sent (using native HTTPS etc.) on the
// same process. BUT, this will only be effective when `extraCA` option is
// passed to `tls.createSecureContext`, which is limited to this library.
request.enableNodeExtraCACerts = function (callback) {
  // @note callback is optional to catch missing tls method
  !callback && (callback = function () {})

  // bail out if already enabled
  if (tls.__createSecureContext) {
    return callback()
  }

  // enable only if `SecureContext.addCACert` is present
  // otherwise return callback with error.
  // @note try-catch is used to make sure testing this will not break
  // the main process due to OpenSSL error.
  try {
    var testContext = tls.createSecureContext()

    if (!(testContext && testContext.context &&
        typeof testContext.context.addCACert === 'function')) {
      return callback(new Error('SecureContext.addCACert is not a function'))
    }
  } catch (err) {
    return callback(err)
  }

  // store the original tls.createSecureContext method.
  // used to extend existing functionality as well as restore later.
  tls.__createSecureContext = tls.createSecureContext

  // override tls.createSecureContext with extraCA support
  // @note if agent is keepAlive, same context will be reused.
  tls.createSecureContext = function () {
    // call original createSecureContext and store the context
    var secureContext = tls.__createSecureContext.apply(this, arguments)

    // if `extraCA` is present in options, extend CA certs
    // @note this request option is available here because all the
    // Request properties are passed to HTTPS Agent.
    if (arguments[0] && arguments[0].extraCA) {
      // extend root CA with specified CA certificates
      // @note `addCACert` is an undocumented API and performs an expensive operations
      // Refer: https://github.com/nodejs/node/blob/v10.15.1/lib/_tls_common.js#L97
      secureContext.context.addCACert(arguments[0].extraCA)
    }

    return secureContext
  }

  // enabled extra CA support
  return callback()
}

// disable the extended CA certificates feature
request.disableNodeExtraCACerts = function () {
  // bail out if not enabled
  if (typeof tls.__createSecureContext !== 'function') {
    return
  }

  // reset `tls.createSecureContext` with the original method
  tls.createSecureContext = tls.__createSecureContext

  // delete the reference of original method
  delete tls.__createSecureContext
}

// Exports

module.exports = request
request.Request = require('./request')
request.initParams = initParams

// Backwards compatibility for request.debug
Object.defineProperty(request, 'debug', {
  enumerable: true,
  get: function () {
    return request.Request.debug
  },
  set: function (debug) {
    request.Request.debug = debug
  }
})
