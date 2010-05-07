/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0
 * LastModified: Dec 25 1999
 * This library is free.  You can redistribute it and/or modify it.
 */
 
 /* Modified by Dan Webb not to require Narwhal's binary library */

var encodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var decodeChars = [
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
    -1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
    -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
];

exports.encode = function (str) {
    var out, i, length;
    var c1, c2, c3;

    length = len(str);
    i = 0;
    out = [];
    while(i < length) {
        c1 = str.charCodeAt(i++) & 0xff;
        if(i == length)
        {
            out.push(encodeChars.charCodeAt(c1 >> 2));
            out.push(encodeChars.charCodeAt((c1 & 0x3) << 4));
            out.push("=".charCodeAt(0));
            out.push("=".charCodeAt(0));
            break;
        }
        c2 = str.charCodeAt(i++);
        if(i == length)
        {
            out.push(encodeChars.charCodeAt(c1 >> 2));
            out.push(encodeChars.charCodeAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4)));
            out.push(encodeChars.charCodeAt((c2 & 0xF) << 2));
            out.push("=".charCodeAt(0));
            break;
        }
        c3 = str.charCodeAt(i++);
        out.push(encodeChars.charCodeAt(c1 >> 2));
        out.push(encodeChars.charCodeAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4)));
        out.push(encodeChars.charCodeAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >>6)));
        out.push(encodeChars.charCodeAt(c3 & 0x3F));
    }
    
    var str = ""; 
    out.forEach(function(chr) { str += String.fromCharCode(chr) });
    return str;
};

exports.decode = function (str) {
    var c1, c2, c3, c4;
    var i, length, out;

    length = len(str);
    i = 0;
    out = [];
    while(i < length) {
        /* c1 */
        do {
            c1 = decodeChars[str.charCodeAt(i++) & 0xff];
        } while(i < length && c1 == -1);
        if(c1 == -1)
            break;

        /* c2 */
        do {
            c2 = decodeChars[str.charCodeAt(i++) & 0xff];
        } while(i < length && c2 == -1);
        if(c2 == -1)
            break;

        out.push(String.fromCharCode((c1 << 2) | ((c2 & 0x30) >> 4)));

        /* c3 */
        do {
            c3 = str.charCodeAt(i++) & 0xff;
            if(c3 == 61)
                return out.join('');
            c3 = decodeChars[c3];
        } while(i < length && c3 == -1);
        if(c3 == -1)
            break;

        out.push(String.fromCharCode(((c2 & 0xF) << 4) | ((c3 & 0x3C) >> 2)));

        /* c4 */
        do {
            c4 = str.charCodeAt(i++) & 0xff;
            if(c4 == 61)
                return out.join('');
            c4 = decodeChars[c4];
        } while(i < length && c4 == -1);

        if(c4 == -1)
            break;

        out.push(String.fromCharCode(((c3 & 0x03) << 6) | c4));
    }

    return out.join('');
};

var len = function (object) {
    if (object.length !== undefined) {
        return object.length;
    } else if (object.getLength !== undefined) {
        return object.getLength();
    } else {
        return undefined;
    }
};
