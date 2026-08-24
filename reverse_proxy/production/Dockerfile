
FROM nginx:1.29.0-alpine

COPY ./web_server/default.conf /etc/nginx/conf.d/default.conf

COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 80 443

ENTRYPOINT ["./run.sh"]
