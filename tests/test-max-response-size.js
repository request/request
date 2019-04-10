'use strict'
var http = require('http')
var tape = require('tape')
var request = require('../index')
var zlib = require('zlib')

/**
 *
 * ugly shim for node 6
 */
var promisify = function (fn) {
  return function () {
    var args = [].slice.apply(arguments)
    return new Promise(function (resolve, reject) {
      fn.apply(null, args.concat([
        function () {
          var results = [].slice.apply(arguments)
          results.length === 1 ? reject(results[0]) : resolve(results[1])
        }]))
    })
  }
}

/**
 * A way to compress with a promise instead of a callback
 */
var zlibPromisified = promisify(zlib.gzip)
/**
 * The mock HTTP server configured in the tape('setup')
 */
var server
/**
 * Arrays initialized by setupCases()
 */
var testCases, testCasesRaw, testCasesGzip, testCasesBadLimits

/**
 * Create the HTTP server without doing listen()
 */
function createHttpServer (testContent, testContentGzip) {
  return http.createServer(function (req, res) {
    res.statusCode = 200

    if (req.url === '/testContent') {
      res.setHeader('Content-Type', 'text/plain')
      res.end(testContent)
    } else if (req.url === '/testContentGzip') {
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Content-Encoding', 'deflate')
      res.end(testContentGzip)
    } else if (req.url === '/testContentRaw') {
      res.setHeader('Content-Type', 'application/octet-stream')
      res.end(testContentGzip)
    }
  })
}

/**
 * Set-up the cases in testCases, testCasesRaw, testCasesGzip
 */
function setupCases (testContent, testContentGzip) {
  testCases = [
    {
      name: 'try request for small data with max response size bigger than data size should be okay',
      path: '/testContent',
      maxResponseSize: testContent.length + 1,
      shouldError: false
    },
    {
      name: 'try request for small data with max response size same as data size should be okay',
      path: '/testContent',
      maxResponseSize: testContent.length,
      shouldError: false
    },
    {
      name: 'request for data with max response size lesser than data size should give error',
      path: '/testContent',
      maxResponseSize: testContent.length - 1,
      shouldError: true
    }
  ]
  testCasesGzip = [
    {
      name: 'gzip: request for small data with max response size bigger than data size should be okay',
      path: '/testContent',
      maxResponseSize: testContent.length + 1,
      shouldError: false,
      gzip: true
    },
    {
      name: 'gzip: request for small data with max response size same as data size should be okay',
      path: '/testContent',
      maxResponseSize: testContent.length,
      shouldError: false,
      gzip: true
    },
    {
      name: 'gzip: request for data with max response size lesser than data size should give error',
      path: '/testContent',
      maxResponseSize: testContent.length - 1,
      shouldError: true,
      gzip: true
    }
  ]
  testCasesRaw = [
    {
      name: 'raw: request for small data with max response size bigger than data size should be okay',
      path: '/testContentRaw',
      maxResponseSize: testContentGzip.length + 1,
      shouldError: false,
      gzip: false,
      encoding: null
    },
    {
      name: 'raw: request for small data with max response size same as data size should be okay',
      path: '/testContentRaw',
      maxResponseSize: testContentGzip.length,
      shouldError: false,
      gzip: false,
      encoding: null
    },
    {
      name: 'raw: request for data with max response size lesser than data size should give error',
      path: '/testContentRaw',
      maxResponseSize: testContentGzip.length - 1,
      shouldError: true,
      gzip: false,
      encoding: null
    }
  ]
  testCasesBadLimits = [
    {
      name: 'bad limit: 0 is not a valid maxResponseSize',
      path: '/testContent',
      maxResponseSize: 0,
      shouldError: false,
      shouldThrow: true
    }, {
      name: 'bad limit: -1 is not a valid maxResponseSize',
      path: '/testContent',
      maxResponseSize: -1,
      shouldError: false,
      shouldThrow: true
    }, {
      name: 'bad limit: \'abc\' is not a valid maxResponseSize',
      path: '/testContent',
      maxResponseSize: 'abc',
      shouldError: false,
      shouldThrow: true
    }
  ]
}

/**
 * Executes a subtest, it receives the the subtest as t and ends it when done
 */
function doCase (t, currCase) {
  var options = { maxResponseSize: currCase.maxResponseSize }
  if (typeof currCase.encoding !== 'undefined') options.encoding = currCase.encoding
  if (currCase.gzip) options.gzip = true
  var doRequest = function () {
    request.get(server.url + currCase.path, options, (err, res, body) => {
      currCase.shouldError ? t.notEqual(err, null) : t.equal(err, null)
      t.end()
    })
  }
  if (currCase.shouldThrow) {
    t.throws(doRequest)
    t.end()
  } else {
    doRequest()
  }
}

/**
 * Generates a Gzipped instance of data
 * Set-ups the test cases by putting the content length of the testContent
 * and testGzippedContent
 * This also configures an HTTP server in
 * the global server var
 */
tape('setup', function (t) {
  var testContent = 'Stuff response bytes\r\n'
  zlibPromisified(testContent).then(function (testGzippedContent) {
    setupCases(testContent, testGzippedContent)
    server = createHttpServer(testContent, testGzippedContent)
    server.listen(0, function () {
      server.url = 'http://localhost:' + this.address().port
      t.end()
    })
  })
})

/**
 * Loops through the test cases create by setupCases()
 * and creates a subtest for each case
 */
tape('subtests', function (t) {
  var allCases = [testCases, testCasesRaw, testCasesGzip, testCasesBadLimits]
  allCases.forEach(caseArr => caseArr.forEach(function (aCase) {
    t.test(aCase.name, function (t) {
      doCase(t, aCase)
    })
  }))

  t.end()
})

/**
 * Closes the HTTP server
 */
tape('cleanup', function (t) {
  server.close(function () {
    t.end()
  })
})
