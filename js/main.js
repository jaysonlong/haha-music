'use strict';
var app = new Vue({
  el: '#app',
  data: {
    currentHash: '',
    playMode: 0,
    scrollbar: 0, // 播放列表进度条
    tabScrollBar: 0, // 搜索结果进度条
    midPos: 0,
    mouseFlag: 0,
    mouseTarget: 0,
    loadingList: false, 
    loadingLyrics: false,
    loadingSong: false,
    noResult: true,
    activeLrc: 0, // 当前活跃的歌词序号
    interval: 0, // 间隔1秒更新播放时间和进度条位置
    pageSize: 20, // 每次加载的歌曲数量
    player: null, // audio元素
    currentTime: 0,
    duration: 0, 
    volume: 1, 
    songIndex: 0,
    searchResult: {}, // 各个音乐源的搜索结果
    listInfo: {}, // 各个音乐源搜索结果的页数和总数量
    lyricArr: [], // 歌词内容数组
    timeArr: [], // 歌词时间数组
    playList: [],
    playListHash: [],
    currentOrigin: CONFIG.defaultOrigin,
    originMap: CONFIG.originMap,
  },
  methods: {
    getSong: function(hash, autoplay = true) {
      if (this.loadingSong) return;
      if (hash == this.currentHash) {
        this.player.currentTime = 0;
        this.player.play();
        return;
      }
      this.currentHash = hash;
      this.timeArr = [];
      this.lyricArr = [];
      this.loadingLyrics = true;
      this.loadingSong = true;
      this.addToList(hash);
      this.songIndex = $.inArray(hash, this.playListHash);
      this.setLocal();
      this.currentTime = 0;
      this.duration = this.playList[this.songIndex].length;
      this.player.paused || this.player.pause();
      this.scrollToSong();
      $('#control .glyphicon-pause').toggleClass('glyphicon-play').toggleClass('glyphicon-pause');

      var that = this;
      var songOrigin = this.playList[this.songIndex].songOrigin;
      var albumId = this.playList[this.songIndex].albumId;
      getSongInfo(songOrigin, hash, albumId, (res) => {
        var { song, lyric, album } = res;
        that.player.src = song.url;
        $('#albumImg').attr('src', album.album1v1Url);
        
        that.player.oncanplay = function() {
          that.player.oncanplay = null;
          that.prepareLyrics(lyric.lyric);
          autoplay && (that.player.play(), $('#control .glyphicon-play').toggleClass('glyphicon-play').toggleClass('glyphicon-pause'));
        };
      });
    },
    prepareLyrics: function(lyrics) {
      this.loadingLyrics = false;
      this.loadingSong = false;
      var content = $('#content');
      content.css('top', this.midPos);

      lyrics = lyrics.trim() || '[00:00.00]找不到歌词';

      var sentences = lyrics.split('\n');
      for (var i in sentences) {
        if (!sentences[i]) continue;
        
        var times = sentences[i].match(/\d+:\d+\.\d+/g);
        if (!times) continue
        var sentence = sentences[i].substr(sentences[i].lastIndexOf(']') + 1);
        if (!sentence.trim()) continue
      
        for (var each of times) {
          var time = each.split(':');
          var sum = Number(time[0]) * 60 + Number(time[1]) || 0;
          sum = sum > 0.2 ? sum - 0.2 : sum;
          var loc = locationOf(sum, this.timeArr);
          insert(sum, this.timeArr);
          this.lyricArr.splice(loc + 1, 0, sentence);
        }
      }
      setTimeout("$('#content').children(':first-child').addClass('activelrc')", 0);
    },
    addToList: function(hash) {
      if ($.inArray(hash, this.playListHash) > -1) return;
      for (var song of this.searchResult[this.currentOrigin]) {
        if (song.hash == hash) {
          this.playList.push(song);
          this.playListHash.push(hash);
          setTimeout(this.scrollbar.resize, 0);
          this.setLocal();
          break;
        }
      }
    },
    removeFromList: function(hash) {
      var i = $.inArray(hash, this.playListHash);
      if (i < 0) return;
      this.playList.splice(i, 1);
      this.playListHash.splice(i, 1);
      setTimeout(this.scrollbar.resize, 0);
      if (this.songIndex == i) {
        this.getSong(this.playListHash[i < this.playListHash.length ? i : 0], !this.player.paused);
      } else {
        this.songIndex = $.inArray(this.currentHash, this.playListHash);
      }
      this.setLocal();
    },
    search: function(page, pageSize, force=false) {
      var keyword = $('#searchBar input').val().trim();
      if (!keyword) {
        this.$set(this.searchResult, this.currentOrigin, []);
        this.listInfo[this.currentOrigin].page = 1;
        this.loadingList = false;
        this.noResult = true;
        return;
      }

      this.noResult = false;
      pageSize = pageSize || this.pageSize;
      page = page || 1;
      if (force) {
        this.$set(this.searchResult, this.currentOrigin, []);
      } else if (page != this.listInfo[this.currentOrigin].page + 1 && keyword == this.listInfo[this.currentOrigin].keyword) {
        return;
      }
      var that = this;
      searchSong(this.currentOrigin, keyword, page, pageSize, (res) => that.prepareResult(res.data, keyword, page));
    },
    convertResult: function (data) {
      var searchResult = [];
      var songInfos = data.info;
      for (var i in songInfos) {
        var { 
            songname: songName, 
            singername: singerName, 
            filename: fileName, 
            duration: length, 
            album_id: albumId, 
            hash, 
          } = songInfos[i];
        searchResult.push({
          songName,
          singerName,
          fileName,
          length,
          hash,
          albumId,
          time: this.convertToTime(length),
          songOrigin: this.currentOrigin,
        });
      }
      return searchResult;
    },
    prepareResult: function(data, keyword, page) {
      var result = this.convertResult(data);
      if (page == this.listInfo[this.currentOrigin].page + 1) {
        this.listInfo[this.currentOrigin].size += result.length;
        var newResult = this.searchResult[this.currentOrigin].concat(result);
        this.$delete(this.searchResult, this.currentOrigin);
        this.$set(this.searchResult, this.currentOrigin, newResult);
      } else {
        $('.tab-content').scrollTop(0);
        this.listInfo[this.currentOrigin].size = result.length;
        this.$delete(this.searchResult, this.currentOrigin);
        this.$set(this.searchResult, this.currentOrigin, result);
      }
      this.listInfo[this.currentOrigin].page = page;
      this.listInfo[this.currentOrigin].keyword = keyword;
      this.loadingList = false;
      this.noResult = this.searchResult[this.currentOrigin].length == 0;
      setTimeout(this.tabScrollBar.resize, 300);
    },
    convertToTime: function(length) {
      length = parseInt(length);
      var div = Math.floor(length / 60) || 0,
        mod = length % 60 || 0;
      div = div > 9 ? div : '0' + div;
      mod = mod > 9 ? mod : '0' + mod;
      return div + ':' + mod;
    },
    setScroll: function(another) {
      clearInterval(this.interval);
      this.interval = setInterval('app.autoProgress()', 1000);
      this.scrollLyrics();
    },
    clearScroll: function() {
      $('#content').stop(true, true);
      clearInterval(this.interval);
    },
    scrollLyrics: function() {
      clearInterval(this.f);
      this.f = setInterval(() => {
        this.moveLyrics();
      }, 200);
    },
    moveLyrics: function(imme = false) {
      var i = locationOf(this.player.currentTime, this.timeArr);;
      if (this.activeLrc == i) {
        return;
      }
      this.activeLrc = i;
      var content = $('#content');
      var ele = content.children(`:nth-child(${ i + 1 })`);
      var offset = ele.offset().top - this.midPos;
      $('.activelrc').removeClass('activelrc');
      ele.addClass('activelrc');

      $('#content').stop(true, true);
      content.animate({
        top: content.offset().top - offset
      }, imme ? 0 : 300, () => {
      });
    },
    backward: function(force = false) {
      var next = this.songIndex;
      (this.playMode == 0 || this.playMode == 1 && force === true) && (next = (next - 1 + this.playListHash.length) % this.playListHash.length);
      this.playMode == 2 && (next = this.getNextRandom(next));
      this.getSong(this.playListHash[next]);
    },
    forward: function(force = false) {
      var next = this.songIndex;
      (this.playMode == 0 || this.playMode == 1 && force === true) && (next = (next + 1) % this.playListHash.length);
      this.playMode == 2 && (next = this.getNextRandom(next));
      this.getSong(this.playListHash[next]);
    },
    getNextRandom: function(index) {
      var next = index;
      if (this.playList.length > 1) {
        while (next == index) {
          next = Math.floor(Math.random() * this.playListHash.length);
        }
      }
      return next;
    },
    scrollToSong: function () {
      var playing = $('tr:nth-child(' + (this.songIndex + 1) + ')');
      if (!playing.length) return;

      var scroll = $('.scroll-table');
      var table = $('.table');

      if (playing.offset().top + playing.height() < scroll.offset().top) {
        scroll.scrollTop(playing.offset().top - table.offset().top);
      } else if (playing.offset().top > scroll.offset().top + scroll.height()) {
        scroll.scrollTop(playing.offset().top - table.offset().top + playing.height() - scroll.height());
      }
    },
    toggle: function() {
      this.player.paused ? (this.player.play(), $('#control .glyphicon-play').toggleClass('glyphicon-play').toggleClass('glyphicon-pause')) : (this.player.pause(), $('#control .glyphicon-pause').toggleClass('glyphicon-play').toggleClass('glyphicon-pause'));
    },
    changeMode: function() {
      this.playMode = (this.playMode + 1) % 3;
      this.setLocal();
    },
    correct: function() {
      this.player.paused ? $('#control .glyphicon-pause').toggleClass('glyphicon-play').toggleClass('glyphicon-pause') : $('#control .glyphicon-play').toggleClass('glyphicon-play').toggleClass('glyphicon-pause');
    },
    autoProgress: function() {
      this.currentTime = this.player.currentTime;
      this.duration = this.player.duration;
      var percent = this.currentTime / this.duration;
      var width = percent * parseInt($('.progress-all').css('width').slice(0, -2));
      $('._progress').css('width', width);
      $('.pro-pointer').css('left', width - 10);
    },
    setProgress: function(e) {
      var maxWidth = parseInt($('.progress-all').css('width').slice(0, -2));
      var pageX = e.type == 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
      var offset = pageX - $('._progress').offset().left;
      var width = Math.max(0, Math.min(offset, maxWidth));
      $('._progress').css('width', width);
      $('.pro-pointer').css('left', width - 10);
      var percent = width / maxWidth;
      this.player.currentTime = this.currentTime = Math.floor(percent * this.duration);
    },
    setVolume: function(e, perc = null) {
      var width, percent;
      var maxWidth = parseInt($('.volume-all').css('width').slice(0, -2));

      if (perc === null) {
        var offset = e.pageX - $('.volume-progress').offset().left;
        width = Math.max(0, Math.min(offset, maxWidth));
        percent = width / maxWidth;
      } else {
        width = perc * maxWidth;
        percent = perc;
      }
      $('.volume-progress').css('width', width);
      $('.volume-pointer').css('left', width - 10);
      this.player.volume = this.volume = percent;
      this.setLocal();
    },
    shutVolume: function() {
      player.volume = player.volume == 0 ? this.volume : 0;
      var width = player.volume * parseInt($('.volume-all').css('width').slice(0, -2));
      $('.volume-progress').css('width', width);
      $('.volume-pointer').css('left', width - 15);
      $('#control .glyphicon-volume-down, #control .glyphicon-volume-off').toggleClass('glyphicon-volume-down').toggleClass('glyphicon-volume-off');
    },
    proDown: function(e) {
      if ($(e.target).isChildAndSelfOf('.pro-pointer')) {
        clearInterval(this.f);
        this.mouseFlag = 1;
        this.mouseTarget = $('.pro-pointer')[0];
        this.player.paused || (this.mouseFlag = 2, this.toggle());
      } else if ($(e.target).isChildAndSelfOf('.volume-pointer')) {
        this.mouseFlag = 1;
        this.mouseTarget = $('.volume-pointer')[0];
      }
    },
    proUp: function(e) {
      if (this.mouseFlag == 2) {
        this.toggle();
      }
      this.mouseFlag = 0;
    },
    proMove: function(e) {
      if (this.mouseFlag > 0) {
        if (this.mouseTarget == $('.pro-pointer')[0]) {
          this.setProgress(e);
        } else if (this.mouseTarget == $('.volume-pointer')[0]) {
          this.setVolume(e);
        }
      }
    },
    getLocal: function() {
      this.songIndex = JSON.parse(window.localStorage.getItem('songIndex')) || 0;
      this.playMode = JSON.parse(window.localStorage.getItem('playMode')) || 0;
      this.volume = JSON.parse(window.localStorage.getItem('volume')) || 1;
      this.playList = JSON.parse(window.localStorage.getItem('playList')) || [];
      for (var songInfo of this.playList) {
        this.playListHash.push(songInfo.hash);
      }
    },
    setLocal: function() {
      window.localStorage.setItem('songIndex', JSON.stringify(this.songIndex));
      window.localStorage.setItem('playMode', JSON.stringify(this.playMode));
      window.localStorage.setItem('volume', JSON.stringify(this.volume));
      window.localStorage.setItem('playList', JSON.stringify(this.playList));
    },
    setOrigin: function(e) {
      this.currentOrigin = e.target.dataset.origin;
      setTimeout(this.tabScrollBar.resize, 300);
    },
    toTop: function () {
      $('.tab-content').scrollTop(0);
    },
    init: function() {
      this.player = $('#player')[0];
      this.scrollbar = $('.scroll-table').niceScroll({ touchbehavior: false });
      this.tabScrollBar = $('.tab-content').niceScroll({ touchbehavior: false });
      this.pageSize = 20;
      this.midPos = parseInt($('#panel').css('height').slice(0, -2)) / 2 - 10;
      this.getLocal();
      this.setVolume(null, this.volume);
      this.playList.length > 0 && 
        (this.getSong(this.playListHash[this.songIndex], false), setTimeout(this.scrollToSong, 300));
      for(var key in this.originMap) {
        this.listInfo[key] = {
          page: 0,
          size: 0,
          keyword: '',
        };
        this.searchResult[key] = [];
      }

      $('[href="#' + this.currentOrigin + '"]').trigger('click');

      // 音量控制
      $(document).keyup((e) => {
        switch (e.keyCode) {
          case 38: // 上方向
            this.setVolume(null, Math.min(1, this.volume + 0.05));
            break;
          case 40: // 下方向
            this.setVolume(null, Math.max(0, this.volume - 0.05));
            break;
        }
      });

      var io = new IntersectionObserver(entries => {
        entries[0].intersectionRatio > 0.005 && this.search(this.listInfo[this.currentOrigin].page + 1);
      });
      $('.loading').each((i, el) => io.observe(el));
    },
  }
});

function init () {
  jQuery.fn.extend({
    isChildAndSelfOf: function(selector) {
      return (this.closest(selector).length > 0);
    }
  });

  // 专辑图片旋转
  var albumImg = $('#albumImg');
  albumImg.count = 0;
  setInterval(() => {
    albumImg.count += 1;
    albumImg.css('transform', 'rotate(' + (albumImg.count % 360) + 'deg)');
  }, 40);
}
init(), app.init();