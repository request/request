var util = require('util')

module.exports = /\brequest\b/.test(process.env.NODE_DEBUG) ? function () {
    console.error('REQUEST %s', util.format.apply(util, arguments))
} : function () {}
