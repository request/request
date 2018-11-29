#!/bin/sh
set -ex

./gen-server.sh
./gen-client.sh
./gen-localhost.sh
