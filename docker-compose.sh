#!/bin/bash

function create_containers() {
    docker network create haha-music > /dev/null 2>&1

    PREV_PORT=`docker inspect --format='{{(index (index .HostConfig.PortBindings "80/tcp") 0).HostPort}}' haha-nginx 2> /dev/null`

    if [ "$PORT" == "-1" ]; then
        if [ "$PREV_PORT" != "" ]; then
            echo delete previous nginx container
            docker stop haha-nginx > /dev/null
            docker rm haha-nginx > /dev/null
        fi

        docker create --name haha-nginx --net haha-music -v $(pwd)/src:/var/www/html \
            -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf nginx:1.24.0  > /dev/null 2>&1
    else
        if [ "$PREV_PORT" == "" ] || [ "$PREV_PORT" != "$PORT" ]; then
            echo delete previous nginx container
            docker stop haha-nginx > /dev/null
            docker rm haha-nginx > /dev/null
        fi

        docker create --name haha-nginx --net haha-music -p ${PORT}:80 -v $(pwd)/src:/var/www/html \
            -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf nginx:1.24.0  > /dev/null 2>&1
    fi

    docker create --name haha-php-fpm --net haha-music -v $(pwd)/src:/var/www/html bitnami/php-fpm:8.0  > /dev/null 2>&1
}

if [ "$1" = "up" ]; then
    PORT=${PORT:-80}
    create_containers
    docker start haha-php-fpm
    docker start haha-nginx
elif [ "$1" = "stop" ]; then
    docker stop haha-php-fpm
    docker stop haha-nginx
else
    echo unknown option $1
fi