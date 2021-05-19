# haha-music
## 哈哈音乐播放器

将四大音乐平台（网易云、酷狗、QQ、虾米）的网页播放源整合成单个网页播放器。

**在线Demo地址**： [哈哈音乐](http://jaysonl.top/haha/)

![cover.png](./resource/cover.png)



------

### 安装部署

#### 1. 快速部署(Docker + php-cli)

拉取代码：

```console
mkdir -p /www && cd /www
git clone https://github.com/jaysonlong/haha-music.git
```

运行 php-cli 容器：

```console
docker run -d -p 8000:80 -v /www/haha-music:/www  php:7-cli php -S 0.0.0.0:80 -t /www
```

验证，浏览器打开 http://127.0.0.1:8000/ ，或执行以下命令：

```console
curl 127.0.0.1:8000
```

#### 2. 其他部署(Host/Docker, php-fpm + nginx/apache)

自己玩去