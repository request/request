'use strict'
var sharedConfig = require('./karma.conf.js')

module.exports = function(config) {
  sharedConfig(config)
  config.set({
    frameworks: ['tap'],
    preprocessors: {
      'tests/browser/test.js': ['webpack'],
      '*.js,!(tests)/**/*.js': ['coverage']
    },
    plugins: [
      'karma-phantomjs-launcher',
      'karma-coverage',
      'karma-webpack',
      'karma-tap'
    ],
    webpack: {
      devtool: 'source-map',
      resolve: {
        modulesDirectories: [
          'node_modules'
        ]
      },
      module: {
        loaders: [
          {
            test: /\.json$/,
            loader: 'json'
          }
        ]
      },
      externals: {
        fs: '{}',
        tls: '{}',
        net: '{}',
        console: '{}'
      }
    }
  })
}
