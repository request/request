var request = require('./index');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/****************************************
 * Public API
 */
var publicOptions = {
    proxy: 'http://localhost:8888',
    url : 'https://15.83.10.14/HP-MJF/PI/1.0/servicediscovery',
    auth: {
        user: '07d99a764c05416e88f2f00fe53dfb67',
        pass: 'c7a62238e5254691b871e4228bb32434',
        sendImmediately: false,
        disable: {
            bearer: true
        }
    }
}

request.get(publicOptions, function (error, response, body) {
    console.log('Public API request');
    if (error) {
        console.log('Error: ' + error);
    } else {
        console.log('Status: ' + response.statusCode);
        if (response.statusCode == '200') {
            publicOptions.url = 'https://15.83.10.14/HP-MJF/PI/1.0/identification';
            request.get(publicOptions, function (error, response, body) {
                console.log('Public API request');
                if (error) {
                    console.log('Error: ' + error);
                } else {
                    console.log('Status: ' + response.statusCode);
                }
            })
        }
    }
})





/********************************************
 * Private API
 */
var privateOptions = {
    proxy: 'http://localhost:8888',
    url : 'https://15.83.10.14/PIWS/3.0/Discovery',
    auth: {
        user: 'a14e6a15532e4ecd913b73d2a9cb39e9',
        pass: 'a69aa6dcf4d345ab86d52a652eb1f142',
        sendImmediately: false,
        disable: {
            bearer: true
        }
    }
}

request.get(privateOptions, function (error, response, body) {
    console.log('Private API request');
    if (error) {
        console.log('Error: ' + error);
    } else {
        console.log('Status: ' + response.statusCode);
    }
})


