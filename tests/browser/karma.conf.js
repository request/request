'use strict'

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['tap'],
    files: [
      'test-browser.js'
    ],
    port: 9876,

    reporters: ['dots'],
    
    colors: true,

    logLevel: config.LOG_ERROR,

    autoWatch: false,

    browsers: ['PhantomJS'],

    singleRun: true
  })
}
