'use strict'

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['browserify', 'tap'],
    files: [
      'test.js'
    ],
    preprocessors: {
      'test.js': [ 'browserify' ]
    },
    port: 9876,

    reporters: ['dots'],
    
    colors: true,

    logLevel: config.LOG_ERROR,

    autoWatch: false,

    browsers: ['PhantomJS'],

    singleRun: true
  })
}
