'use strict';
Vue.config.devtools = true;
var app = new Vue({
  el: '#app',
  data: {
    lastVersion: '1.1',
    version: '',
    songInfo: {},
    songList: [], // play list
    songIdList: [], // play list of id
    listenHistory: [],
    result: {}, // search result of current origin
    allResult: {}, // all search result
    playMode: 0,
    playIndex: 0, 
    volume: 0.5, 
    keyword: '',
    origins: CONFIG.origins,
    origin: CONFIG.defaultOrigin,
    pageSize: 20,
    currentTime: 0, // currentTime of the audio
    player: null, // audio element
    status: {
      searching: false, 
      loadingSong: false,
      noResult: true,
    },
    lyric: {
      sentences: [], // lyric sentences
      times: [], // lyric time array
      activeLrcIndex: 0,
    },
    api: {
      search: null,
      retrieval: null,
    },
    storageList: [
      'songList', 'playIndex', 'playMode', 'volume', 'version', 'keyword', 'origin',
    ],
    mouseParam: {
      flag: 0,
      target: 0,
    },
  },
  methods: {
    retrieve: async function(songId, autoplay = true) {
      if (songId == this.songInfo.songId) {
        this.player.currentTime = 0;
        this.player.play();
        return;
      }
      this.lyric.times = [];
      this.lyric.sentences = [];
      this.status.loadingSong = true;
      this.addToList(songId);
      this.playIndex = this.songIdList.indexOf(songId);
      this.setLocal('playIndex');
      this.songInfo = this.songList[this.playIndex];
      this.currentTime = 0;
      this.player.paused || this.player.pause();
      this.scrollToSong();
      $('#control .glyphicon-pause').toggleClass('glyphicon-play').toggleClass('glyphicon-pause');

      var song = await this.api.retrieval.retrieve(this.songInfo, 'song');
      if (song.songId != this.songIdList[this.playIndex]) return;
      this.player.src = song.url;
      this.listenHistory.push(song.songId);

      var that = this;
      this.player.oncanplay = async function() {
        that.player.oncanplay = null;
        autoplay && (that.player.play(), $('#control .glyphicon-play').toggleClass('glyphicon-play').toggleClass('glyphicon-pause'));
        var lyric = await that.api.retrieval.retrieve(that.songInfo, 'lyric');
        that.prepareLyrics(lyric.lyric || that.songInfo.lyric);
      };

      var album = await this.api.retrieval.retrieve(this.songInfo, 'album');
      $('#albumImg').attr('src', album.album1v1Url || this.songInfo.album1v1Url || 'images/record.png');
      
      
    },
    prepareLyrics: function(lyrics) {
      this.status.loadingSong = false;
      var content = $('#content');
      content.css('top', this.midPos);

      lyrics = lyrics.trim() || '[00:00.00]找不到歌词';
      var sentences = lyrics.split('\n');
      for (var sentence of sentences) {
        if (!sentence) continue;

        sentence = sentence.split(/<\d+>/).join(''); // convert trc to lrc
        var times = sentence.match(/\d+:\d+\.\d+/g);
        if (!times) continue
        sentence = sentence.substr(sentence.lastIndexOf(']') + 1);
        if (!sentence.trim()) continue
        // handle abbreviated lrc like [00:03.124][01:02.437]xxx
        for (var each of times) {
          var time = each.split(':');
          var sum = Number(time[0]) * 60 + Number(time[1]) || 0;
          sum = sum > 0.2 ? sum - 0.2 : sum;
          var loc = locationOf(sum, this.lyric.times);
          insert(sum, this.lyric.times);
          this.lyric.sentences.splice(loc + 1, 0, sentence);
        }
      }
      doAsync("$('#content').children(':first-child').addClass('activelrc')");
    },
    addToList: function(songId) {
      if (this.songIdList.indexOf(songId) > -1) return;
      for (var song of this.result.songs) {
        if (song.songId == songId) {
          this.songList.push(song);
          this.songIdList.push(songId);
          doAsync(this.playListScrollBar.resize);
          this.setLocal('songList');
          break;
        }
      }
    },
    removeFromList: function(songId) {
      var i = this.songIdList.indexOf(songId);
      if (i < 0) return;
      this.songList.splice(i, 1);
      this.songIdList.splice(i, 1);
      doAsync(this.playListScrollBar.resize);
      if (this.playIndex == i) {
        this.retrieve(this.songIdList[i < this.songIdList.length ? i : 0], !this.player.paused);
      } else {
        this.playIndex = this.songIdList.indexOf(this.songInfo.songId);
      }
      this.setLocal('songList');
    },
    search: function(page, force=false) {
      this.setLocal('keyword,origin');
      if (!this.keyword) {
        this.$set(this.result, 'songs', []);
        this.result.page = 1;
        this.status.searching = false;
        this.status.noResult = true;
        return;
      }

      page = page || this.result.page + 1;
      this.status.noResult = false;
      if (force || this.keyword != this.result.keyword) {
        this.$set(this.result, 'songs', []);
      } else if(page != this.result.page + 1) {
        return;
      }

      this.api.search.search(this.origin, this.keyword, page, this.pageSize)
        .then((res) => this.prepareResult(res, page));
    },
    prepareResult: function(data, page) {
      if (page == this.result.page + 1) {
        var newResult = this.result.songs.concat(data.songs);
        this.$delete(this.result, 'songs');
        this.$set(this.result, 'songs', newResult);
      } else {
        $('.tab-content').scrollTop(0);
        this.$delete(this.result, 'songs');
        this.$set(this.result, 'songs', data.songs);
      }
      this.result.page = page;
      this.result.keyword = this.keyword;
      this.status.searching = false;
      this.status.noResult = data.songs.length < this.pageSize;
      doAsync(this.searchResultScrollBar.resize);
    },
    convertTime: function(time) {
      time = parseInt(time);
      var div = Math.floor(time / 60) || 0,
        mod = time % 60 || 0;
      div = div > 9 ? div : '0' + div;
      mod = mod > 9 ? mod : '0' + mod;
      return div + ':' + mod;
    },
    setScroll: function(another) {
      clearInterval(this.proInterval);
      this.proInterval = setInterval('app.autoProgress()', 1000);
      clearInterval(this.lrcInterval);
      this.lrcInterval = setInterval(() => {
        this.moveLyrics();
      }, 200);
    },
    clearScroll: function() {
      $('#content').stop(true, true);
      clearInterval(this.proInterval);
    },
    moveLyrics: function(imme = false) {
      var i = locationOf(this.player.currentTime, this.lyric.times);
      if (this.lyric.activeLrcIndex == i) {
        return;
      }
      this.lyric.activeLrcIndex = i;
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
      var next = this.playIndex;
      (this.playMode == 0 || this.playMode == 1 && force === true) && (next = (next - 1 + this.songIdList.length) % this.songIdList.length);
      this.playMode == 2 && (next = this.getNextRandom());
      this.retrieve(this.songIdList[next]);
    },
    forward: function(force = false) {
      var next = this.playIndex;
      (this.playMode == 0 || this.playMode == 1 && force === true) && (next = (next + 1) % this.songIdList.length);
      this.playMode == 2 && (next = this.getNextRandom());
      this.retrieve(this.songIdList[next]);
    },
    getNextRandom: function() {
      var half = Math.floor(this.songIdList.length / 2);
      var recentHistory = this.listenHistory.slice(Math.max(this.listenHistory.length - half, 0));
      var restSong = this.songIdList.filter(songId => recentHistory.indexOf(songId) == -1);
      var index = Math.floor(Math.random() * restSong.length);
      var next = this.songIdList.indexOf(restSong[index]);
      return next;
    },
    scrollToSong: function () {
      var playing = $('tr:nth-child(' + (this.playIndex + 1) + ')');
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
      this.setLocal('playMode');
    },
    correct: function() {
      this.player.paused ? $('#control .glyphicon-pause').toggleClass('glyphicon-play').toggleClass('glyphicon-pause') : $('#control .glyphicon-play').toggleClass('glyphicon-play').toggleClass('glyphicon-pause');
    },
    autoProgress: function() {
      this.currentTime = this.player.currentTime;
      var percent = this.currentTime / this.songInfo.time;
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
      this.player.currentTime = this.currentTime = Math.floor(percent * this.songInfo.time);
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
      this.setLocal('volume');
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
        clearInterval(this.lrcInterval);
        this.mouseParam.flag = 1;
        this.mouseParam.target = $('.pro-pointer')[0];
        this.player.paused || (this.mouseParam.flag = 2, this.toggle());
      } else if ($(e.target).isChildAndSelfOf('.volume-pointer')) {
        this.mouseParam.flag = 1;
        this.mouseParam.target = $('.volume-pointer')[0];
      }
    },
    proUp: function(e) {
      if (this.mouseParam.flag == 2) {
        this.toggle();
      }
      this.mouseParam.flag = 0;
    },
    proMove: function(e) {
      if (this.mouseParam.flag > 0) {
        if (this.mouseParam.target == $('.pro-pointer')[0]) {
          this.setProgress(e);
        } else if (this.mouseParam.target == $('.volume-pointer')[0]) {
          this.setVolume(e);
        }
      }
    },
    toTop: function() {
      $('.tab-content').scrollTop(0);
    },
    getLocal: function() {
      this.storageList.forEach(item => {
        try {
          this[item] = JSON.parse(localStorage.getItem(item)) || this[item];
        } catch (e) {}
      });
      this.songIdList = this.songList.map(song => song.songId);
      // clear songList if current version isn't the last version
      if (this.version != this.lastVersion) {
        this.songList = [];
        this.version = this.lastVersion;
        localStorage.clear();
        this.setLocal();
      }
    },
    setLocal: function(keys) {
      if (keys) {
        keys.split(',').forEach(item => {
          localStorage.setItem(item, JSON.stringify(this[item]));
        });
      } else {
        this.storageList.forEach(item => {
          localStorage.setItem(item, JSON.stringify(this[item]));
        });
      }
    },
    setOrigin: function(event, origin = null) {
      this.origin = origin || event.target.dataset.origin;
      this.result = this.allResult[this.origin];
      this.search(1);
      doAsync(this.searchResultScrollBar.resize);
    },
    init: function() {
      this.api.search = new Search();
      this.api.retrieval = new Retrieval();
      this.player = $('#player')[0];
      this.playListScrollBar = $('.scroll-table').niceScroll({ touchbehavior: false });
      this.searchResultScrollBar = $('.tab-content').niceScroll({ touchbehavior: false });
      this.pageSize = 20;
      this.midPos = parseInt($('#panel').css('height').slice(0, -2)) / 2 - 10;
      this.getLocal();
      this.setVolume(null, this.volume);
      this.songList.length > 0 && this.retrieve(this.songIdList[this.playIndex], false);
      for(var item of this.origins) {
        this.allResult[item.name] = {
          page: 0,
          keyword: '',
          songs: [],
        };
      }
      this.setOrigin(null, this.origin);
      $('[href="#' + this.origin + '"]').click();

      // volume control
      $(document).keyup((e) => {
        switch (e.keyCode) {
          case 38: // up
            this.setVolume(null, Math.min(1, this.volume + 0.05));
            break;
          case 40: // down
            this.setVolume(null, Math.max(0, this.volume - 0.05));
            break;
        }
      });

      var io = new IntersectionObserver(entries => {
        entries[0].intersectionRatio > 0.005 && app.result.songs.length != 0
         && this.search();
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

  // album image rotate
  var albumImg = $('#albumImg');
  albumImg.count = 0;
  setInterval(() => {
    albumImg.count += 1;
    albumImg.css('transform', 'rotate(' + (albumImg.count % 360) + 'deg)');
  }, 40);
}
init(), app.init();