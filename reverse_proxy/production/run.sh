#!/bin/sh

echo "Starting Nginx web server for proxy..."

# Reload every 6h so certificates renewed by certbot are picked up
while :; do
  sleep 6h & wait $!
  echo "Reloading Nginx to pick up renewed certificates..."
  nginx -s reload
done &

exec nginx -g 'daemon off;'
