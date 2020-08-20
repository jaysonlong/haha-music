
var wangyiEncryption = {
  entry(data) {
    function a(a) {
      var d, e, b = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        c = "";
      for (d = 0; a > d; d += 1) e = Math.random() * b.length, e = Math.floor(e), c += b.charAt(e);
      return c
    }

    function b(a, b) {
      var c = CryptoJS.enc.Utf8.parse(b),
        d = CryptoJS.enc.Utf8.parse("0102030405060708"),
        e = CryptoJS.enc.Utf8.parse(a),
        f = CryptoJS.AES.encrypt(e, c, { iv: d, mode: CryptoJS.mode.CBC });
      return f.toString()
    }

    function c(a, b, c) {
      var d, e;
      return setMaxDigits(131),
        d = new RSAKeyPair(b, "", c),
        e = encryptedString(d, a)
    }

    function d(d, e, f, g) {
      var h = {},
        i = a(16);
      return h.encText = b(d, g),
        h.encText = b(h.encText, i),
        h.encSecKey = c(i, e, f), h
    }

    var json = JSON.stringify(data);
    var rs = d(
      json,
      "010001",
      "00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7",
      "0CoJUm6Qyw8W8jud"
    );

    return {
      params: rs.encText,
      encSecKey: rs.encSecKey,
    };
  },

  getSongParams(id) {
    var data = {
      br: CONFIG.defaultWangyiBr,
      csrf_token: "",
      ids: "[" + id + "]",
    };
    return this.entry(data);
  },

  getSongParamsMobile(id) {
    var data = {
      ids: "[" + id + "]",
      level: "standard",
      encodeType: "aac",
    };
    return this.entry(data);
  },

  getAlbumParams(id) {
    var data = {
      id,
      c: '[{"id":"' + id + '"}]',
      csrf_token: "",
    };
    return this.entry(data);
  },

  getLyricParams(id) {
    var data = {
      id: id + '',
      lv: -1,
      tv: -1,
      csrf_token: "",
    }
    return this.entry(data);
  },

  getSearchParams(keyword, page, pageSize, type = 1) {
    page = page > 0 ? page : 1;
    offset = pageSize * (page - 1);
    var data = {
      "hlpretag": "<span class=\"s-fc7\">",
      "hlposttag": "</span>",
      "s": keyword,
      "type": type,
      "offset": offset,
      "total": "false",
      "limit": pageSize,
      "csrf_token": "",
    };
    return this.entry(data);
  },

  getSearchParamsMobile(keyword, page, pageSize, type = 1) {
    page = page > 0 ? page : 1;
    offset = pageSize * (page - 1);
    var data = {
      "s": keyword,
      "type": type,
      "offset": offset,
      "limit": pageSize,
      "strategy": 5,
      "queryCorrect": true,
    };
    return this.entry(data);
  },

  decodeAbroad(data) {
    if (data.abroad == true) {
      var encKey = 'fuck~#$%^&*(458';
      var parseResult = JSON.parse(decodeURIComponent(cgN9E(data.result, encKey)));
      data.result = parseResult;
    }
  },
};

var Search = function() {}

Search.prototype.getParams = function(searchInfo) {
  var { origin, keyword, page, pageSize, force } = searchInfo;
  var params = { origin };
  force && (params.t = new Date().getTime());

  if (origin == 'wangyi') {
    var useMobile = true;
    var methodName = useMobile ? 'getSearchParamsMobile' : 'getSearchParams';
    Object.assign(params, wangyiEncryption[methodName](keyword, page, pageSize), { useMobile });
  } else {
    Object.assign(params, { keyword, page, pagesize: pageSize });
  }
  return params;
};

Search.prototype.parseData = function(origin, data) {
  var songs = [], total = 0;

  switch (origin) {
    case 'kugou': 
      songs = data.data.info;
      total = data.data.total;
      songs = songs.map(song => {
        return {
          songName: song.songname,
          singerName: song.singername,
          fileName: song.singername + ' - ' + song.songname,
          time: song.duration,
          songId: song.hash,
          albumId: song.album_id,
          album1v1Url: "",
          lyric: "",
          origin: origin,
          vip: song.privilege == 10,
        }
      });
      break;

    case 'qq': 
      songs = data.data.song.list;
      total = data.data.song.totalnum;
      songs = songs.map(song => {
        return {
          songName: song.name,
          singerName: song.singer[0].name,
          fileName: song.singer[0].name + ' - ' + song.name,
          time: song.interval,
          songId: song.mid,
          albumId: song.album.mid,
          album1v1Url: "",
          lyric: "",
          origin: origin,
          vip: song.pay.pay_play == 1,
        }
      });
      break;

    case 'xiami':
      if (data.result) { // new api
        songs = data.result.data.songs;
        total = data.result.data.pagingVO.count || songs.length;
        songs = songs.map(song => {
          return {
            songName: song.songName,
            singerName: song.singers,
            fileName: song.singers + ' - ' + song.songName,
            time: song.length / 1000,
            songId: song.songId,
            albumId: song.albumId,
            album1v1Url: song.albumLogo,
            lyric: song.lyricInfo && song.lyricInfo.lyricFile || "",
            origin: origin,
            vip: false,
          }
        });
      } else if (data.data) { // old api
        songs = data.data.songs;
        total = data.data.total;
        songs = songs.map(song => {
          return {
            songName: song.song_name,
            singerName: song.artist_name,
            fileName: song.artist_name + ' - ' + song.song_name,
            time: song.length,
            songId: song.song_id,
            albumId: song.album_id,
            album1v1Url: song.album_logo,
            lyric: song.lyric || (song.lyricInfo && song.lyricInfo.lyricFile) || "",
            origin: origin,
            vip: song.pay ? true : false,
          }
        });
      } else {
        showTip('抱歉，虾米好像出了点问题');
      }
      break;

    case 'wangyi': 
      wangyiEncryption.decodeAbroad(data);
      if (data.result.songCount < 1 || !data.result.songs) {
        break;
      }
      songs = data.result.songs;
      total = data.result.songCount;
      songs = songs.map(song => {
        return {
          songName: song.name,
          singerName: song.ar[0].name,
          fileName: song.ar[0].name + ' - ' + song.name,
          time: song.dt / 1000,
          songId: song.id,
          albumId: song.al.id,
          album1v1Url: "",
          lyric: "",
          origin: origin,
          vip: song.fee == 1,
        }
      });
      break;
  }

  return { songs, total };
};

Search.prototype.search = async function(searchInfo) {
  var params = this.getParams(searchInfo);
  var data = await getData(CONFIG.searchUrl, params, CONFIG.type);
  var result = this.parseData(searchInfo.origin, data);
  return result;
}

var Retrieval = function() {
  this.cache = {};
}

Retrieval.prototype.getParams = function(songInfo, target, force) {
  var params = { origin: songInfo.origin, target, useMobile: songInfo.vip };

  if (songInfo.origin == 'wangyi') {
    var methodName;
    if (target == 'song') {
      methodName = params.useMobile ? 'getSongParamsMobile' : 'getSongParams';
    } else {
      methodName = 'get' + target.charAt(0).toUpperCase() + target.substr(1) + 'Params';
    }

    wangyiParams = wangyiEncryption[methodName](songInfo.songId);
    var cookie = '_ntes_nuid=' + fetch_visitor_hash();
    Object.assign(params, wangyiParams, { cookie });
  } else {
    Object.assign(params, { songId: songInfo.songId, albumId: songInfo.albumId });
  }
  force && (params.t = new Date().getTime());
  return params;
};

Retrieval.prototype.buildQQAlbumUrl = function(albumId) {
  var 
    e = "//y.gtimg.cn/mediastyle/macmusic_v4/extra/default_cover.png?max_age=31536000", 
    o = 'album', n = 300, i = albumId;

  return window.devicePixelRatio && parseInt(window.devicePixelRatio) > 1 && (150 == n && (n = 300),
  (68 == n || 90 == n) && (n = 150)),
  "string" == typeof i && i.length >= 14 ? (o = "album" == o ? "T002" : "singer" == o ? "T001" : o,
  e = "//y.gtimg.cn/music/photo_new/" + o + "R" + (n || 68) + "x" + (n || 68) + "M000" + i + ".jpg?max_age=2592000") : i > 0 && (e = "//y.gtimg.cn/music/photo/" + o + "_" + (n || 68) + "/" + i % 100 + "/" + (n || 68) + "_" + o + "pic_" + i + "_0.jpg?max_age=2592000"),
  e;
}

Retrieval.prototype.parseData = async function(songInfo, target, data) {
  var result = {};

  switch (songInfo.origin) {
    case 'kugou':
      result.song = { url: data.data.play_url, vip: data.data.privilege == 10 };
      result.album = { album1v1Url: data.data.img };
      result.lyric = { lyric: data.data.lyrics };
      if (data.err_code != 0) {
        result.song.err = data;
      }
      break;

    case 'qq':
      if (target == 'song') {
        var url;
        if (songInfo.vip) {
          url = data[0].m4aUrl;
        } else {
          url = data.req_0.data.midurlinfo[0].purl;
          if (!url) {
            var { filename, vkey } = data.req_0.data.midurlinfo[0];
            var guid = data.req_0.data.testfile2g.match(/guid=(\d+)/)[1];
            url =  `${filename}?guid=${guid}&vkey=${vkey}&fromtag=`;
          }
          url = 'http://dl.stream.qqmusic.qq.com/' + url;
        }
        result.song = { url };
      } else if (target == 'album') {
        result.album = { album1v1Url: this.buildQQAlbumUrl(songInfo.albumId) };
      } else if (target == 'lyric') {
        result.lyric = { lyric: base64decode(data.lyric) };
      }
      break;

    case 'xiami':
      var playInfos = data.result.data.songPlayInfos[0].playInfos.filter(song => song.listenFile != '');
      var playInfo = playInfos.length ? playInfos[playInfos.length-1] : {};
      var { listenFile: url='', length=0 } = playInfo;
      songInfo.time = songInfo.time || Math.floor(length / 1000);
      result.song = { url };
      result.album = { album1v1Url: songInfo.album1v1Url || '' };
      result.lyric =  { lyric: '' };
      try {
        result.lyric = { 
          lyric: songInfo.lyric ? await fetch(songInfo.lyric).then(resp => resp.text()) : '' 
        };
      } catch(e) {}
      break;

    case 'wangyi':
      try {
        if (target == 'song') {
          result.song = data.data[0];
          result.song.vip = result.song.fee == 1;
        } else if (target == 'album') {
          result.album =  { album1v1Url: '' };
          result.album = { album1v1Url: data.songs[0].al.picUrl + '?param=200y200' };
        } else if (target == 'lyric') {
          result.lyric =  { lyric: '' };
          var lyric = data.lrc.lyric || data.tlyric.lyric || data.klyric.lyric;
          result.lyric = { lyric };
        }
      } catch(e) {}
      break;
  }

  if (result.lyric) {
    result.lyric.lyric = result.lyric.lyric || songInfo.lyric || CONFIG.defaultLyric;
  }
  if (result.album) {
    result.album.album1v1Url =  result.album.album1v1Url || songInfo.album1v1Url || CONFIG.defaultAlbum;
  }
  this.cache[songInfo.songId] = this.cache[songInfo.songId] || {};
  Object.assign(this.cache[songInfo.songId], result);
  return result[target];
};

Retrieval.prototype.retrieve = async function(songInfo, target, force) {
  if ((!force || target != 'song') && this.cache[songInfo.songId] && this.cache[songInfo.songId][target]) {
    return this.cache[songInfo.songId][target];
  }

  var params = this.getParams(songInfo, target, force);
  var data = await getData(CONFIG.retrieveUrl, params, CONFIG.type);
  var result = await this.parseData(songInfo, target, data);
  return result;
}
