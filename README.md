# haha-music
## 哈哈音乐播放器

将四大音乐平台（网易云、酷狗、QQ、虾米）的网页播放源整合成单个网页播放器。

**在线Demo地址**： [哈哈音乐](http://jaysonl.top/haha/)

![cover.png](./resource/cover.png)



------

### 安装部署

#### 1. 使用docker-compose

```console
# 克隆
git clone https://github.com/jaysonlong/haha-music.git && cd haha-music

# 启动容器，使用80端口
PORT=80 docker-compose up -d

# 验证
curl 127.0.0.1

# 停止容器
PORT=80 docker-compose stop
```

#### 2. 使用docker

```console
# 克隆
git clone https://github.com/jaysonlong/haha-music.git && cd haha-music

# 启动容器，使用80端口
PORT=80 sh docker-compose.sh up

# 验证
curl 127.0.0.1

# 停止容器
sh docker-compose.sh stop
```
