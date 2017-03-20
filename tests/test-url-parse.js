'use strict'

var url = require('../lib/url-parse')
var tape = require('tape')

tape('parse - "a=b&c=d"', function (t) {
  var str = 'a=b&c=d'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'c', value: 'd' }
  ])
  t.end()
})

tape('parse - "a=обязательный&c=d"', function (t) {
  var str = 'a=обязательный&c=d'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'обязательный' },
        { key: 'c', value: 'd' }
  ])
  t.end()
})

tape('parse - "a=b&c"', function (t) {
  var str = 'a=b&c'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'c', value: null }
  ])
  t.end()
})

tape('parse - "a=b&c="', function (t) {
  var str = 'a=b&c='
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'c', value: '' }
  ])
  t.end()
})

tape('parse - "a=b&c=&d=e"', function (t) {
  var str = 'a=b&c=&d=e'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'c', value: '' },
        { key: 'd', value: 'e' }
  ])
  t.end()
})

tape('parse - "a=b&c&d=e"', function (t) {
  var str = 'a=b&c&d=e'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'c', value: null },
        { key: 'd', value: 'e' }
  ])
  t.end()
})

tape('parse - "a=b&a=c"', function (t) {
  var str = 'a=b&a=c'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'a', value: 'c' }
  ])
  t.end()
})

tape('parse - "a=b&a"', function (t) {
  var str = 'a=b&a'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: 'a', value: null }
  ])
  t.end()
})

tape('parse - "a=b&=cd"', function (t) {
  var str = 'a=b&=cd'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: '', value: 'cd' }
  ])
  t.end()
})

tape('parse - "a=b&=&"', function (t) {
  var str = 'a=b&=&'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: '', value: '' },
        { key: '', value: null }
  ])
  t.end()
})

tape('parse - "a=b&&"', function (t) {
  var str = 'a=b&&'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: null, value: null },
        { key: '', value: null }
  ])
  t.end()
})

tape('parse - "a=b&&c=d"', function (t) {
  var str = 'a=b&&c=d'
  t.deepEqual(url.parse(str), [
        { key: 'a', value: 'b' },
        { key: null, value: null },
        { key: 'c', value: 'd' }
  ])
  t.end()
})

// Stringification
tape('stringify - "a=b&c=d"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'c', value: 'd' }
  ]
  t.equal(url.stringify(parsed), 'a=b&c=d')
  t.end()
})

tape('stringify - "a=обязательный&c=d"', function (t) {
  var parsed = [
        { key: 'a', value: 'обязательный' },
        { key: 'c', value: 'd' }
  ]
  t.equal(url.stringify(parsed), 'a=%D0%BE%D0%B1%D1%8F%D0%B7%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D0%BD%D1%8B%D0%B9&c=d')
  t.end()
})

tape('stringify - "a=b&c"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'c', value: null }
  ]
  t.equal(url.stringify(parsed), 'a=b&c')
  t.end()
})

tape('stringify - "a=b&c="', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'c', value: '' }
  ]

  t.equal(url.stringify(parsed), 'a=b&c=')
  t.end()
})

tape('stringify - "a=b&c=&d=e"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'c', value: '' },
        { key: 'd', value: 'e' }
  ]

  t.equal(url.stringify(parsed), 'a=b&c=&d=e')
  t.end()
})

tape('stringify - "a=b&c&d=e"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'c', value: null },
        { key: 'd', value: 'e' }
  ]

  t.equal(url.stringify(parsed), 'a=b&c&d=e')
  t.end()
})

tape('stringify - "a=b&a=c"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'a', value: 'c' }
  ]

  t.equal(url.stringify(parsed), 'a=b&a=c')
  t.end()
})

tape('stringify - "a=b&a"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: 'a', value: null }
  ]
  t.equal(url.stringify(parsed), 'a=b&a')
  t.end()
})

tape('stringify - "a=b&=cd"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: '', value: 'cd' }
  ]
  t.equal(url.stringify(parsed), 'a=b&=cd')
  t.end()
})

tape('stringify - "a=b&=&"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: '', value: '' },
        { key: '', value: null }
  ]
  t.equal(url.stringify(parsed), 'a=b&=&')
  t.end()
})

tape('stringify - "a=b&&"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: null, value: null },
        { key: '', value: null }
  ]
  t.equal(url.stringify(parsed), 'a=b&&')
  t.end()
})

tape('stringify - "a=b&&c=d"', function (t) {
  var parsed = [
        { key: 'a', value: 'b' },
        { key: null, value: null },
        { key: 'c', value: 'd' }
  ]
  t.equal(url.stringify(parsed), 'a=b&&c=d')
  t.end()
})

tape('stringify - "email=foo+bar-xyz@gmail.com"', function (t) {
  var parsed = [
        { key: 'email', value: 'foo+bar-xyz@gmail.com' }
  ]
  t.equal(url.stringify(parsed), 'email=foo+bar-xyz@gmail.com')
  t.end()
})

tape('stringify pre encoded text( must avoid double encoding) - "email=foo%2Bbar%40domain.com"', function (t) {
  var parsed = [
        { key: 'email', value: 'foo%2Bbar%40domain.com' }
  ]
  t.equal(url.stringify(parsed), 'email=foo%2Bbar%40domain.com')
  t.end()
})

tape('stringify multibyte character - "multibyte=𝌆"', function (t) {
  var parsed = [
        { key: 'multibyte', value: '𝌆' }
  ]
  t.equal(url.stringify(parsed), 'multibyte=%F0%9D%8C%86')
  t.end()
})

tape('stringify pre-encoded multibyte character - "multibyte=%F0%9D%8C%86"', function (t) {
  var parsed = [
        { key: 'multibyte', value: '%F0%9D%8C%86' }
  ]
  t.equal(url.stringify(parsed), 'multibyte=%F0%9D%8C%86')
  t.end()
})

tape('stringify encoding percentage - "charwithPercent=%foo"', function (t) {
  var parsed = [
        { key: 'multibyte', value: '%foo' }
  ]
  t.equal(url.stringify(parsed), 'multibyte=%25foo')
  t.end()
})

tape('stringify - "a[0]=foo&a[1]=bar"', function (t) {
  var parsed = [
        { key: 'a[0]', value: 'foo' },
        { key: 'a[1]', value: 'bar' }
  ]
  t.equal(url.stringify(parsed), 'a[0]=foo&a[1]=bar')
  t.end()
})

tape('stringify encodes ( and )- "a=foo(a)"', function (t) {
  var parsed = [
        { key: 'a', value: 'foo(a)' }
  ]
  t.equal(url.stringify(parsed), 'a=foo%28a%29')
  t.end()
})

tape('stringify Russian - "a=Привет Почтальон"', function (t) {
  var parsed = [
        { key: 'a', value: 'Привет Почтальон' }
  ]
  t.equal(url.stringify(parsed), 'a=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%D0%9F%D0%BE%D1%87%D1%82%D0%B0%D0%BB%D1%8C%D0%BE%D0%BD')
  t.end()
})

tape('stringify Chinese- "a=你好"', function (t) {
  var parsed = [
        { key: 'a', value: '你好' }
  ]
  t.equal(url.stringify(parsed), 'a=%E4%BD%A0%E5%A5%BD')
  t.end()
})

tape('stringify Japanese- "a=ハローポストマン"', function (t) {
  var parsed = [
        { key: 'a', value: 'ハローポストマン' }
  ]
  t.equal(url.stringify(parsed), 'a=%E3%83%8F%E3%83%AD%E3%83%BC%E3%83%9D%E3%82%B9%E3%83%88%E3%83%9E%E3%83%B3')
  t.end()
})

tape('stringify Partial Russian - "a=Hello Почтальон"', function (t) {
  var parsed = [
        { key: 'a', value: 'Hello Почтальон' }
  ]
  t.equal(url.stringify(parsed), 'a=Hello%20%D0%9F%D0%BE%D1%87%D1%82%D0%B0%D0%BB%D1%8C%D0%BE%D0%BD')
  t.end()
})

tape('stringify pre encoded russian text - a=Hello%20%D0%9F%D0%BE%D1%87%D1%82%D0%B0%D0%BB%D1%8C%D0%BE%D0%BD', function (t) {
  var parsed = [
        { key: 'a', value: 'Hello%20%D0%9F%D0%BE%D1%87%D1%82%D0%B0%D0%BB%D1%8C%D0%BE%D0%BD' }
  ]
  t.equal(url.stringify(parsed), 'a=Hello%20%D0%9F%D0%BE%D1%87%D1%82%D0%B0%D0%BB%D1%8C%D0%BE%D0%BD')
  t.end()
})

tape('url parse - "http://httpbin.org/get?z=b,c"', function (t) {
  var parsed = url('http://httpbin.org/get?z=b,c')

  t.equal(parsed.search, '?z=b,c')
  t.equal(parsed.query, 'z=b,c')
  t.equal(parsed.path, '/get?z=b,c')
  t.equal(parsed.href, 'http://httpbin.org/get?z=b,c')

  t.end()
})

tape('url parse with invalid encoded parameters - ""', function (t) {
  t.doesNotThrow(function () {
    url('http://httpbin.org/get?&c=%d')
    t.end()
  })
})
