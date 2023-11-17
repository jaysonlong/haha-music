#!/bin/bash

if [ "$1" = "up" ]; then
    docker rm haha_php_fpm 2> /dev/null
    docker run --name haha_php_fpm -v $(pwd)/src:/var/www/html -d bitnami/php-fpm:8.0

    docker rm haha_nginx 2> /dev/null
    docker run --name haha_nginx --link haha_php_fpm:php-fpm -p ${PORT:-80}:80 \
        -v $(pwd)/src:/var/www/html -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf -d nginx:1.24.0

elif [ "$1" = "stop" ]; then
    docker stop haha_php_fpm
    docker stop haha_nginx
fi