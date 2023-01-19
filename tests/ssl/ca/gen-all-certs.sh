#!/bin/sh
set -ex

# Create a certificate authority
openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca.key -out ca.crt

./gen-server.sh
./gen-client.sh
./gen-localhost.sh
