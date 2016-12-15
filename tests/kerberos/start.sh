#!/bin/bash

# Starting the KDC
/usr/heimdal/libexec/kdc&

# Creating the bob principal (fake user)
/usr/heimdal/sbin/kadmin -l add --password=Passw0rd --use-defaults bob

# Creating the service principal, setting up the krb5.keytab and getting a TGT for the service
/usr/heimdal/sbin/kadmin -l add --random-key --use-defaults HTTP/localhost
/usr/heimdal/sbin/kadmin -l ext_keytab HTTP/localhost
/usr/heimdal/bin/kinit -k -t /etc/krb5.keytab HTTP/localhost

KRB5_TRACE=/dev/stdout /usr/local/bin/node /opt/target-server/index.js