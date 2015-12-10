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
    files: [
      'tests/browser/test.js'
    ],
    plugins: [
      'karma-phantomjs-launcher',
      'karma-coverage',
      'karma-webpack',
      'karma-tap'
    ],
    webpack: {
      devtool: 'source-map',
      node: {
        console: true,
        fs: 'empty',
        net: 'empty',
        tls: 'empty'
      },
      resolve: {
        modulesDirectories: [
          'node_modules'
        ]
      },
      module: {
        loaders: [
          {
            test: /\.json$/,
            loader: 'json-loader'
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
