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

var cookies = require('./lib/cookies')
  , copy = require('./lib/copy')
  , extend  = require('util')._extend
  ;

// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
  callback = filterForCallback([options, callback])
  options = constructOptions(uri, options)

  return constructObject()
    .extend({callback: callback})
    .extend({options: options})
    .extend({uri: options.uri})
    .done()
}

function request (uri, options, callback) {
  if (typeof uri === 'undefined')
    throw new Error('undefined is not a valid uri or options object.')

  var params = initParams(uri, options, callback)
  options = params.options
  options.callback = params.callback
  options.uri = params.uri

  return new request.Request(options)
}

function requester(params) {
  if(typeof params.options._requester === 'function')
    return params.options._requester
  return request
}

request.get = function (uri, options, callback) {
  var params = initParams(uri, options, callback)
  params.options.method = 'GET'
  return requester(params)(params.uri || null, params.options, params.callback)
}

request.head = function (uri, options, callback) {
  var params = initParams(uri, options, callback)
  params.options.method = 'HEAD'

  if (paramsHaveRequestBody(params))
    throw new Error("HTTP HEAD requests MUST NOT include a request body.")

  return requester(params)(params.uri || null, params.options, params.callback)
}

request.post = function (uri, options, callback) {
  var params = initParams(uri, options, callback)
  params.options.method = 'POST'
  return requester(params)(params.uri || null, params.options, params.callback)
}

request.put = function (uri, options, callback) {
  var params = initParams(uri, options, callback)
  params.options.method = 'PUT'
  return requester(params)(params.uri || null, params.options, params.callback)
}

request.patch = function (uri, options, callback) {
  var params = initParams(uri, options, callback)
  params.options.method = 'PATCH'
  return requester(params)(params.uri || null, params.options, params.callback)
}

request.del = function (uri, options, callback) {
  var params = initParams(uri, options, callback)
  params.options.method = 'DELETE'
  return requester(params)(params.uri || null, params.options, params.callback)
}

request.jar = function () {
  return cookies.jar()
}
request.cookie = function (str) {
  return cookies.parse(str)
}

request.defaults = function (options, requester) {

  var wrap = function (method) {
    var headerlessOptions = function (options) {
      options = extend({}, options)
      delete options.headers
      return options
    }

    var getHeaders = function (params, options) {
      return constructObject()
        .extend(options.headers)
        .extend(params.options.headers)
        .done()
    }

    return function (uri, opts, callback) {
      var params = initParams(uri, opts, callback)
      params.options = extend(params.options, headerlessOptions(options))

      if (options.headers)
        params.options.headers = getHeaders(params, options)

      if (isFunction(requester)) {
        if (method === request) {
          method = requester
        } else {
          params.options._requester = requester
        }
      }

      return method(params.options, params.callback)
    }
  }

  defaults        = wrap(this)
  defaults.get    = wrap(this.get)
  defaults.patch  = wrap(this.patch)
  defaults.post   = wrap(this.post)
  defaults.put    = wrap(this.put)
  defaults.head   = wrap(this.head)
  defaults.del    = wrap(this.del)
  defaults.cookie = wrap(this.cookie)
  defaults.jar    = this.jar
  return defaults
}

request.forever = function (agentOptions, optionsArg) {
  var options = constructObject()
  if (optionsArg) options.extend(optionsArg)
  if (agentOptions) options.agentOptions = agentOptions

  options.extend({forever: true})
  return request.defaults(options)
}

// Helpers

function constructObject(initialObject) {
  initialObject = initialObject || {}

  return {
    extend: function (object) {
      return constructObject(extend(initialObject, object))
    },
    done: function () {
      return initialObject
    }
  }
}

function constructOptions(uri, options) {
  var params = constructObject()
  if (typeof uri === 'object') params.extend(uri)
  if (typeof uri === 'string') params.extend({uri: uri})
  params.extend(options)
  return params.done()
}

function filterForCallback(values) {
  var callbacks = values.filter(isFunction)
  return callbacks[0]
}

function isFunction(value) {
  return typeof value === 'function'
}

function paramsHaveRequestBody(params) {
  return (
    params.options.body ||
    params.options.requestBodyStream ||
    (params.options.json && typeof params.options.json !== 'boolean') ||
    params.options.multipart
  )
}

// Exports

module.exports = request
request.Request = require('./request')
request.debug = process.env.NODE_DEBUG && /\brequest\b/.test(process.env.NODE_DEBUG)
request.initParams = initParams
