#!/bin/sh
set -ex

# generate new CA
openssl req -new -x509 -days 9999 -config ca.cnf -keyout ca.key -out ca.crt

./gen-server.sh
./gen-client.sh
./gen-localhost.sh
