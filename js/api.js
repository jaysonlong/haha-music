
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

    json = JSON.stringify(data);
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
    let data = {
      br: CONFIG.default163Br,
      csrf_token: "",
      ids: "[" + id + "]",
    };

    return this.entry(data);
  },

  getAlbumParams(id) {
    let data = {
      id,
      c: '[{"id":"' + id + '"}]',
      csrf_token: "",
    };
    return this.entry(data);
  },

  getLyricParams(id) {
    let data = {
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
    let data = {
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

  decodeAbroad(data) {
    if (data.abroad == true) {
      var encKey = 'fuck~#$%^&*(458';
      var parseResult = JSON.parse(decodeURIComponent(cgN9E(data.result, encKey)));
      data.result = parseResult;
    }
  },
};

var Search = function() {}

Search.prototype.getParams = function() {
  var params = { origin: this.origin };
  Object.assign(params, this.origin == 'wangyi' ? 
    wangyiEncryption.getSearchParams(this.keyword, this.page, this.pageSize) : 
    { keyword: this.keyword, page: this.page, pagesize: this.pageSize });
  return params;
};

Search.prototype.parseData = function(data) {
  var songs = [], total = 0;
  switch (this.origin) {
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
          origin: this.origin,
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
          origin: this.origin,
        }
      });
      break;

    case 'xiami':
      songs = data.result.data.songs;
      total = songs.length;
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
          origin: this.origin,
        }
      });
      break;

    case 'wangyi': 
      wangyiEncryption.decodeAbroad(data);
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
          origin: this.origin,
        }
      });
      break;
  }

  return { songs, total };
};

Search.prototype.search = async function(origin, keyword, page, pageSize) {
  this.origin = origin;
  this.keyword = keyword;
  this.page = page;
  this.pageSize = pageSize;
  var params = this.getParams();
  var data = await getData(CONFIG.searchUrl, params, CONFIG.type);
  var result = this.parseData(data);
  return result;
}

var Retrieval = function() {
  this.cache = {};
}

Retrieval.prototype.getParams = function(target) {
  var params = { origin: this.origin, target };
  if (this.origin == 'wangyi') {
    target = target.charAt(0).toUpperCase() + target.substr(1);
    var wangyiParams = wangyiEncryption['get' + target + 'Params'](this.songInfo.songId);
    var cookie = '_ntes_nuid=' + fetch_visitor_hash();
    Object.assign(params, wangyiParams, { cookie });
  } else {
    Object.assign(params, { songId: this.songInfo.songId, albumId: this.songInfo.albumId });
  }

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

Retrieval.prototype.parseData = async function(data, target) {
  var result = {};

  switch (this.origin) {
    case 'kugou':
      result.song = { url: data.data.play_url };
      result.album = { album1v1Url: data.data.img };
      result.lyric = { lyric: data.data.lyrics };
      break;

    case 'qq':
      if (target == 'song') {
        result.song = { url: 'http://dl.stream.qqmusic.qq.com/' + data.req_0.data.midurlinfo[0].purl };
      } else if (target == 'album') {
        result.album = { album1v1Url: this.buildQQAlbumUrl(this.songInfo.albumId) };
      } else if (target == 'lyric') {
        result.lyric = { lyric: base64decode(data.lyric) };
      }
      break;

    case 'xiami':
      var playInfos = data.result.data.songPlayInfos[0].playInfos.filter(song => song.listenFile != '');
      result.song = { url: playInfos[playInfos.length-1].listenFile };
      result.album = { album1v1Url: this.songInfo.album1v1Url || '' };
      try {
        result.lyric = { lyric: await fetch(this.songInfo.lyric).then(resp => resp.text()) };
      } finally {
        result.lyric = result.lyric || { lyric: '' };
      }
      break;

    case 'wangyi':
      try {
        if (target == 'song') {
          result.song = data.data[0];
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

  if (target == 'song') {
    result.song.songId = this.songInfo.songId;
  }
  this.cache[this.songInfo.songId] = this.cache[this.songInfo.songId] || {};
  Object.assign(this.cache[this.songInfo.songId], result);
  return result[target];
};

Retrieval.prototype.retrieve = async function(songInfo, target) {
  if (this.cache[songInfo.songId] && this.cache[songInfo.songId][target]) {
    return this.cache[songInfo.songId][target];
  }
  this.songInfo = songInfo;
  this.origin = songInfo.origin;
  var params = this.getParams(target);
  var data = await getData(CONFIG.retrieveUrl, params, CONFIG.type);
  var result = await this.parseData(data, target);
  return result;
}
