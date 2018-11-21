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

function parseAbroad(data) {
  if (data.abroad == true) {
    var encKey = 'fuck~#$%^&*(458';
    var parseResult = JSON.parse(decodeURIComponent(cgN9E(data.result, encKey)));
    data.result = parseResult;
  }
}

function entry(data) {
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
}


function getAlbumParams(id) {
  var data = {
    id,
    c: '[{"id":"' + id + '"}]',
    csrf_token: "",
  };

  var rs = entry(data);
  return rs;
}

function getSongParams(id) {
  var data = {
    br: CONFIG.default163Br,
    csrf_token: "",
    ids: "[" + id + "]",
  };

  var rs = entry(data);
  return rs;
}

function getLyricParams(id) {
  var data = {
    id: id + '',
    lv: -1,
    tv: -1,
    csrf_token: "",
  }
  var rs = entry(data);
  return rs;
}

function insert(element, array) {
  array.splice(locationOf(element, array) + 1, 0, element);
  return array;
}

function locationOf(element, array, start, end) {
  start = start || 0;
  end = end || array.length;
  var pivot = parseInt(start + (end - start) / 2, 10);
  if (end-start <= 1 || array[pivot] === element) return pivot;
  if (array[pivot] < element) {
    return locationOf(element, array, pivot, end);
  } else {
    return locationOf(element, array, start, pivot);
  }
}

function base64decode(encrypted) {
  var rs = CryptoJS.enc.Base64.parse(encrypted);
  return rs.toString(CryptoJS.enc.Utf8);
}

function getQQAlbum(album_mid) {
  var 
    e = "//y.gtimg.cn/mediastyle/macmusic_v4/extra/default_cover.png?max_age=31536000", 
    o = 'album', n = 300, i = album_mid;

  return window.devicePixelRatio && parseInt(window.devicePixelRatio) > 1 && (150 == n && (n = 300),
  (68 == n || 90 == n) && (n = 150)),
  "string" == typeof i && i.length >= 14 ? (o = "album" == o ? "T002" : "singer" == o ? "T001" : o,
  e = "//y.gtimg.cn/music/photo_new/" + o + "R" + (n || 68) + "x" + (n || 68) + "M000" + i + ".jpg?max_age=2592000") : i > 0 && (e = "//y.gtimg.cn/music/photo/" + o + "_" + (n || 68) + "/" + i % 100 + "/" + (n || 68) + "_" + o + "pic_" + i + "_0.jpg?max_age=2592000"),
  e;
}

function getXiamiUrl(a) {
  if (-1 !== a.indexOf("http://"))
      return a;
  for (var b = Number(a.charAt(0)), c = a.substring(1), d = Math.floor(c.length / b), e = c.length % b, f = new Array, g = 0; e > g; g++)
      void 0 == f[g] && (f[g] = ""),
      f[g] = c.substr((d + 1) * g, d + 1);
  for (g = e; b > g; g++)
      f[g] = c.substr(d * (g - e) + (d + 1) * e, d);
  var h = "";
  for (g = 0; g < f[0].length; g++)
      for (var i = 0; i < f.length; i++)
          h += f[i].charAt(g);
  h = unescape(h);
  var j = "";
  for (g = 0; g < h.length; g++)
      j += "^" == h.charAt(g) ? "0" : h.charAt(g);
  return j.replace("+", " ");
}


function getSearchParams(keyword, page, pageSize, type = 1) {
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
    "csrf_token": ""
  };
  var rs = entry(data)
  return rs;
}

function parseSongs(songOrigin, res) {
  var obj = {};
  switch (songOrigin) {
    case 'kugou': 
      obj = res;
      break;

    case 'qq': 
      var { list: songs, totalnum: total } = res.data.song;
      for (var song of songs) {
        song.songname = song.name;
        song.singername = song.singer[0].name;
        song.filename = song.singername + ' - ' + song.songname;
        song.duration = song.interval;
        song.hash = song.mid;
        song.album_id = song.album.mid;
      }
      obj.data = {
        info: songs,
        total: total,
      }
      break;

    case 'xiami':
      obj.data = res;
      break;

    case '163': 
      parseAbroad(res);
      var { songs, songCount: total } = res.result;

      for (var song of songs) {
        song.songname = song.name;
        song.singername = song.ar[0].name;
        song.filename = song.singername + ' - ' + song.songname;
        song.duration = song.dt / 1000;
        song.hash = song.id;
        song.album_id = song.al.id;
      }

      obj.data = {
        info: songs,
        total: total,
      }
      break;
  }

  return obj;
}

function parseSongInfo(songOrigin, res) {
  switch (songOrigin) {
    case 'kugou':
    res.song = { url: res.data.play_url };
    res.album = { album1v1Url: res.data.img };
    res.lyric = { lyric: res.data.lyrics };
    break;

    case 'qq':
    res.song = { url: 'http://dl.stream.qqmusic.qq.com/' + res.song.req_0.data.midurlinfo[0].purl };
    res.album = { album1v1Url: getQQAlbum(res.album) };
    res.lyric = { lyric: base64decode(res.lyric.lyric) };
    break;

    case 'xiami':
    res.song = { url: getXiamiUrl(res.song.data.trackList[0].location) };
    res.album = { album1v1Url: res.album };
    res.lyric = { lyric: res.lyric };
    break;

    case '163':
    res.song = res.song.data[0];
    try {
      var album1v1Url = res.album.songs[0].al.picUrl + '?param=200y200';
      res.album = { album1v1Url };
    } catch (e) {
    }
    try {
      var lyric = res.lyric.lrc.lyric || res.lyric.tlyric.lyric || res.lyric.klyric.lyric;
      res.lyric = { lyric };
    } catch (e) {
    }
    
    typeof album1v1Url == 'undefined' && (res.album =  { album1v1Url: 'images/record.png' });
    typeof lyric == 'undefined' && (res.lyric = { lyric: '' });
  }

  return res;
}

function searchSong(songOrigin, keyword, page, pageSize, callback) {
  if (songOrigin == '163') {
    params = getSearchParams(keyword, page, pageSize);
  } else {
    params = { keyword, page, pagesize: pageSize };
  }
  params.origin = songOrigin;
  $.get(CONFIG.searchUrl, params, (res) => {
    res = parseSongs(songOrigin, res);
    callback(res);
  }, CONFIG.dataType);
}

function getSongInfo(songOrigin, hash, albumId, callback) {
  var params;
  if (songOrigin == '163') {
    var songParams = getSongParams(hash);
    var albumParams = getAlbumParams(hash);
    var lyricParams = getLyricParams(hash);
    var cookie = '_ntes_nuid=' + fetch_visitor_hash();
    params = {
      cookie,
      songParams: songParams.params,
      songEncSecKey: songParams.encSecKey,
      albumParams: albumParams.params,
      albumEncSecKey: albumParams.encSecKey,
      lyricParams: lyricParams.params,
      lyricEncSecKey: lyricParams.encSecKey,
    }
  } else {
    params = { hash, album_id: albumId };
  }
  params.origin = songOrigin;
  $.get(CONFIG.getUrl, params, (res) => {
    res = parseSongInfo(songOrigin, res);
    res.song.hash = hash;
    callback(res);
  }, CONFIG.dataType);
}