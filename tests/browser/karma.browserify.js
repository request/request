'use strict'
var sharedConfig = require('./karma.conf.js')
var istanbul = require('browserify-istanbul')

module.exports = function(config) {
  sharedConfig(config)
  config.set({
    frameworks: ['tap', 'browserify'],
    preprocessors: {
      'tests/browser/test.js': ['browserify'],
      '*.js,!(tests)/**/*.js': ['coverage']
    },
    plugins: [
      'karma-phantomjs-launcher',
      'karma-coverage',
      'karma-browserify',
      'karma-tap'
    ],
    browserify: {
      debug: true,
      transform: [istanbul({
        ignore: ['**/node_modules/**', '**/tests/**']
      })]
    }
  })
}
