#!/bin/sh
set -ex
openssl req \
    -newkey rsa:2048 \
    -x509 \
    -nodes \
    -keyout ca2.key \
    -new \
    -out ca2.crt \
    -subj /CN=localhost \
    -sha256 \
    -days 3650


openssl genrsa -out localhost-2.key 2048

# Create a certificate signing request
openssl req -new -sha256 -key localhost-2.key -out localhost-2.csr -config localhost.cnf -days 1095

## Use the CSR and the CA key (previously generated) to create a certificate
openssl x509 -req \
    -in localhost-2.csr \
    -CA ca2.crt \
    -CAkey ca2.key \
    -set_serial 0x`date +%s` \
    -out localhost-2.crt \
    -days 1095
