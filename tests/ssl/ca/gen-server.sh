#!/bin/sh
set -ex
# fixes:
# Error: error:140AB18F:SSL routines:SSL_CTX_use_certificate:ee key too small
# on Node > v10

openssl genrsa 4096 > server.key

openssl req -new -nodes -sha256 -key server.key -config server.cnf -out server.csr

openssl x509 -req \
  -sha256 \
  -in server.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -out server.crt \
  -passin 'pass:password' \
  -days 3650
