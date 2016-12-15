FROM rmanyari/docker-heimdal:extend-me

RUN cd /opt && wget https://nodejs.org/dist/v6.9.2/node-v6.9.2-linux-x64.tar.xz && tar -xvf node-v6.9.2-linux-x64.tar.xz -C /usr/local --strip-components=1

RUN mkdir /opt/target-server
RUN apt-get install -y libkrb5-dev

COPY ./tests/kerberos/start.sh /etc/start.sh
COPY ./tests/kerberos/target-server/index.js /opt/target-server/index.js
COPY ./tests/kerberos/target-server/package.json /opt/target-server/package.json
RUN cd /opt/target-server && /usr/local/bin/npm install

RUN chmod 755 /etc/start.sh

EXPOSE 88
EXPOSE 8000

CMD ./etc/start.sh