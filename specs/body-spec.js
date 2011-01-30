var http = require('http');
    request = require('../main');

describe('raw body', function(){

  var fakeClient = new http.Client();
      fakeRequest = new http.ClientRequest({});

  beforeEach(function(){
    spyOn(http, 'createClient').andReturn(fakeClient);
    spyOn(fakeClient, 'request').andReturn(fakeRequest);
  });

  it('should accept string', function(){

    request({
      method: 'POST',
      uri: 'http://nodejs.org',
      body: 'Oh hi.'
    });

    //expect(http.createClient).toHaveBeenCalledWith(80, 'nodejs.org', false); // TODO: move to basic-spec
    expect(fakeClient.request).toHaveBeenCalledWith('POST', '/', { host: 'nodejs.org', 'content-length': 'Oh hi.'.length });
    expect(fakeRequest.output[1].toString()).toEqual('Oh hi.');
  });

  it('should accept buffer', function(){
    request({
      method: 'POST',
      uri: 'http://nodejs.org',
      body: new Buffer('Oh hi.')
    });

    expect(fakeClient.request).toHaveBeenCalledWith('POST', '/', { host: 'nodejs.org', 'content-length': 'Oh hi.'.length });
    expect(fakeRequest.output[1].toString()).toEqual('Oh hi.');
  });
});

describe('json', function(){

  it('should be converted to json string', function(){

    var fakeClient = new http.Client();
        fakeRequest = new http.ClientRequest({});

    spyOn(http, 'createClient').andReturn(fakeClient);
    spyOn(fakeClient, 'request').andReturn(fakeRequest);

    request({
      method: 'POST',
      uri: 'http://nodejs.org',
      json: {foo: 'bar'}
    });

    expect(fakeClient.request).toHaveBeenCalledWith('POST', '/', {
      'host': 'nodejs.org',
      'content-length': JSON.stringify({foo: 'bar'}).length,
      'content-type': 'application/json' });
    expect(fakeRequest.output[1].toString()).toEqual('{"foo":"bar"}');
  });
});

describe('multipart', function(){
  it('should be joined', function(){

    var fakeClient = new http.Client();
        fakeRequest = new http.ClientRequest({});

    spyOn(http, 'createClient').andReturn(fakeClient);
    spyOn(fakeClient, 'request').andReturn(fakeRequest);

    request({
      method: 'POST',
      uri: 'http://nodejs.org',
      multipart: [{'content-type': 'text/html', 'body': '<html><body>Oh hi.</body></html>'}, {'body': 'Oh hi.'}]
    });

    var body = '--frontier\r\n' +
      'content-type: text/html\r\n' +
      '\r\n' +
      '<html><body>Oh hi.</body></html>' +
      '\r\n--frontier\r\n\r\n' +
      'Oh hi.' +
      '\r\n--frontier--'

    expect(fakeClient.request).toHaveBeenCalledWith('POST', '/', {
      'host': 'nodejs.org',
      'content-length': new Buffer(body).length,
      'content-type': 'multipart/related;boundary="frontier"' });
    expect(fakeRequest.output[1].toString()).toEqual(body);
  });
});

describe('exception', function(){
  it('should be thrown on non PUT and POST requests with body, json or multipart')

  it('should be thrown on non comaptibile body types', function(){
    expect(function(){
      request({
        method: 'POST',
        uri: 'http://nodejs.org',
        body: {foo: 'bar'}
      });
    }).toThrow(new Error('Argument error'))

    expect(function(){
      request({
        method: 'POST',
        uri: 'http://nodejs.org',
        multipart: 'foo'
      });
    }).toThrow(new Error('Argument error'))

    expect(function(){
      request({
        method: 'POST',
        uri: 'http://nodejs.org',
        multipart: [{}]
      });
    }).toThrow(new Error('Body attribute missing'))
  });
})
