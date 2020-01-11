'use strict'

const url = require('url')
const isUrl = /^https?:/

class Redirect {
  constructor (request) {
    this.request = request
    this.followRedirect = true
    this.followRedirects = true
    this.followAllRedirects = false
    this.followOriginalHttpMethod = false
    this.allowRedirect = () => true
    this.maxRedirects = 10
    this.redirects = []
    this.redirectsFollowed = 0
    this.removeRefererHeader = false
  }

  onRequest (options) {
    if (options.maxRedirects !== undefined) {
      this.maxRedirects = options.maxRedirects
    }
    if (typeof options.followRedirect === 'function') {
      this.allowRedirect = options.followRedirect
    }
    if (options.followRedirect !== undefined) {
      this.followRedirects = !!options.followRedirect
    }
    if (options.followAllRedirects !== undefined) {
      this.followAllRedirects = options.followAllRedirects
    }
    if (this.followRedirects || this.followAllRedirects) {
      this.redirects = this.redirects || []
    }
    if (options.removeRefererHeader !== undefined) {
      this.removeRefererHeader = options.removeRefererHeader
    }
    if (options.followOriginalHttpMethod !== undefined) {
      this.followOriginalHttpMethod = options.followOriginalHttpMethod
    }
  }

  redirectTo (response) {
    const { request } = this

    let redirectTo = null
    if (
      response.statusCode >= 300 &&
      response.statusCode < 400 &&
      response.caseless.has('location')
    ) {
      const location = response.caseless.get('location')
      request.debug('redirect', location)

      if (this.followAllRedirects) {
        redirectTo = location
      } else if (this.followRedirects) {
        switch (request.method) {
          case 'PATCH':
          case 'PUT':
          case 'POST':
          case 'DELETE':
            // Do not follow redirects
            break
          default:
            redirectTo = location
            break
        }
      }
    } else if (response.statusCode === 401) {
      const authHeader = request._auth.onResponse(response)
      if (authHeader) {
        request.setHeader('authorization', authHeader)
        redirectTo = request.uri
      }
    }
    return redirectTo
  }

  onResponse (response) {
    const { request } = this

    let redirectTo = this.redirectTo(response)
    if (!redirectTo || !this.allowRedirect.call(request, response)) {
      return false
    }

    request.debug('redirect to', redirectTo)

    // ignore any potential response body.  it cannot possibly be useful
    // to us at this point.
    // response.resume should be defined, but check anyway before calling. Workaround for browserify.
    if (response.resume) {
      response.resume()
    }

    if (this.redirectsFollowed >= this.maxRedirects) {
      request.emit(
        'error',
        new Error(
          'Exceeded maxRedirects. Probably stuck in a redirect loop ' +
            request.uri.href
        )
      )
      return false
    }
    this.redirectsFollowed += 1

    if (!isUrl.test(redirectTo)) {
      redirectTo = url.resolve(request.uri.href, redirectTo)
    }

    const uriPrev = request.uri
    request.uri = url.parse(redirectTo)

    // handle the case where we change protocol from https to http or vice versa
    if (request.uri.protocol !== uriPrev.protocol) {
      delete request.agent
    }

    this.redirects.push({
      statusCode: response.statusCode,
      redirectUri: redirectTo
    })

    if (
      this.followAllRedirects &&
      request.method !== 'HEAD' &&
      response.statusCode !== 401 &&
      response.statusCode !== 307
    ) {
      request.method = this.followOriginalHttpMethod ? request.method : 'GET'
    }
    // request.method = 'GET' // Force all redirects to use GET || commented out fixes #215
    delete request.src
    delete request.req
    delete request._started
    if (response.statusCode !== 401 && response.statusCode !== 307) {
      // Remove parameters from the previous response, unless this is the second request
      // for a server that requires digest authentication.
      delete request.body
      delete request._form
      if (request.headers) {
        request.removeHeader('host')
        request.removeHeader('content-type')
        request.removeHeader('content-length')
        if (request.uri.hostname !== request.originalHost.split(':')[0]) {
          // Remove authorization if changing hostnames (but not if just
          // changing ports or protocols).  This matches the behavior of curl:
          // https://github.com/bagder/curl/blob/6beb0eee/lib/http.c#L710
          request.removeHeader('authorization')
        }
      }
    }

    if (!this.removeRefererHeader) {
      request.setHeader('referer', uriPrev.href)
    }

    request.emit('redirect')

    request.init()

    return true
  }
}

module.exports = { Redirect }
