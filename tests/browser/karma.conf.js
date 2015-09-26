'use strict'

module.exports = function(config) {
  config.set({
    basePath: '../..',

    files: [
      'tests/browser/test.js'
    ],
    port: 9876,

    reporters: ['dots', 'coverage'],

    colors: true,

    logLevel: config.LOG_ERROR,

    autoWatch: false,

    browsers: ['PhantomJS_without_security'],

    singleRun: true,

    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    },

    // Custom launcher to allowe self signed certs.
    customLaunchers: {
      PhantomJS_without_security: {
        base: 'PhantomJS',
        flags: [
          '--ignore-ssl-errors=true'
        ]
      }
    }
  })
}
