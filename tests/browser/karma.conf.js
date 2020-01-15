'use strict'
const istanbul = require('browserify-istanbul')
process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = config => {
  config.set({
    client: { requestTestUrl: process.argv[4] },
    basePath: '../..',
    frameworks: ['tap', 'browserify'],
    preprocessors: {
      'tests/browser/test.js': ['browserify'],
      '*.js,!(tests)/**/*.js': ['coverage']
    },
    files: ['tests/browser/test.js'],
    port: 9876,

    reporters: ['dots', 'coverage'],

    colors: true,

    logLevel: config.LOG_ERROR,

    autoWatch: false,

    browsers: ['ChromeHeadless_without_security'],

    singleRun: true,

    plugins: [
      'karma-chrome-launcher',
      'karma-coverage',
      'karma-browserify',
      'karma-tap'
    ],
    browserify: {
      debug: true,
      transform: [
        istanbul({
          ignore: ['**/node_modules/**', '**/tests/**']
        })
      ]
    },
    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    },

    // Custom launcher to allowe self signed certs.
    customLaunchers: {
      ChromeHeadless_without_security: {
        base: 'ChromeHeadless',
        flags: ['--allow-insecure-localhost=true']
      }
    }
  })
}
