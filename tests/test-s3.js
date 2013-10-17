try {
  require('aws-sign')
} catch (e) {
  console.error('aws-sign must be installed to run this test.')
  console.error('skipping this test. please install aws-sign and run again if you need to test this feature.')
  process.exit(0)
}

var request = require('../index')

var r = request.get('https://log.curlybracecast.com.s3.amazonaws.com/',
  { aws:
    { key: 'AKIAI6KIQRRVMGK3WK5Q'
    , secret: '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'
    , bucket: 'log.curlybracecast.com'
    }
  }, function (e, resp, body) {
    console.log(r.headers)
    console.log(body)
  }
)
