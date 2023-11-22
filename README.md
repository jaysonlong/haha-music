# haha-music
## 哈哈音乐播放器

将四大音乐平台（网易云、酷狗、QQ、虾米）的网页播放源整合成单个网页播放器。

**在线Demo地址**： [哈哈音乐](http://jaysonl.top/haha-music/)

![cover.png](./resource/cover.png)



------

### 安装部署

#### 克隆项目

```bash
git clone https://github.com/jaysonlong/haha-music.git && cd haha-music
```

#### docker-compose 启动

```bash
# 启动容器，监听80端口
docker-compose up -d

# 监听指定端口
PORT=8080 docker-compose up -d

# 停止容器
docker-compose stop
```

#### docker 启动

```bash
# 启动容器，监听80端口
./docker-compose.sh up

# 监听指定端口
PORT=8080 ./docker-compose.sh up

# 停止容器
./docker-compose.sh stop
```

#### 访问页面

浏览器访问 http://localhost