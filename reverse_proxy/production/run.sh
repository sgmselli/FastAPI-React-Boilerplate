#!/bin/sh

echo "Starting Nginx web server for proxy..."

exec nginx -g 'daemon off;'
