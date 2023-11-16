'use strict';

Vue.config.devtools = true;

var storageMixin = {
  data: { 'storageAttrs': [] },
  created: function () {
    this.storageAttrs.forEach(key => {
      try {
        var item = localStorage.getItem(key);
        this[key] = item ? JSON.parse(item) : this[key];
      } finally {
        this.saveStorage(key);
      }
    });

    this.storageAttrs.forEach(key => {
      this.$watch(key, value => {
        this.saveStorage(key);
      });
    });
  },
  methods: {
    saveStorage: function(key) {
      localStorage.setItem(key, JSON.stringify(this[key]));
    }
  }
}

Vue.component('play-list', {
  template: '#play-list',
  props: ['songList', 'playIndex'],
  inject: ['retrieve'],

  data: function() {
    return {
      playList: null,
      filtering: false,
    }
  },

  watch: {
    songList: function(val) {
      Vue.nextTick(this.handleFilter);
      Vue.nextTick(this.playListScrollBar.resize);
    },
    playIndex: function() {
      Vue.nextTick(this.scrollToSong);
    },
  },

  mounted: function() {
    this.playList = $('.scroll-table');
    this.playListScrollBar = this.playList.niceScroll({ enablekeyboard: false });
    Vue.nextTick(this.scrollToSong);
  },

  methods: {
    removeFromList: function(songInfo) {
      var i = this.songList.indexOf(songInfo);
      if (i == -1) return;
      this.songList.splice(i, 1);
      this.$emit('song_removed', i);
    },
    toggleFilter: function() {
      this.filtering = !this.filtering;
      if (this.filtering) {
        this.playList.css('height', '82%');
        Vue.nextTick(() => $('#filtering input').focus());
      } else {
        this.playList.animate({ height: '85%' });
        $('#filtering input').val('');
        this.handleFilter(true);
      }
    },
    handleFilter: function(force = false) {
      if (!this.filtering && force === false) {
        return;
      }

      var filterKeyword = $('#filtering input').val().trim().toLowerCase();
      if (filterKeyword == '') {
        this.playList.find('table tr').removeClass('hover').css('display', 'table-row');
        return;
      }

      var hasStart = false;
      this.playList.find('table tr').removeClass('hover').each((i, ele) => {
        if ((i + 1 + ' - ' + this.songList[i].fileName).toLowerCase().indexOf(filterKeyword) === -1) {
          ele.style.display = 'none';
        } else {
          ele.style.display = 'table-row';
          if (!hasStart) {
            ele.classList.add('hover');
            hasStart = true;
          }
        }
      });
      hasStart && this.scrollToSong(0);
    },
    triggerMove: function(event) {
      var filterResult = this.playList.find('table tr:visible');
      if (filterResult.length == 0) {
        return;
      }
      var hoverIndex = filterResult.index(filterResult.filter('.hover'));
      switch (event.keyCode) {
        case 38: // up
          hoverIndex = hoverIndex == -1 ? 0 : hoverIndex - 1;
          event.preventDefault();
          break;
        case 40: // down
          hoverIndex = hoverIndex == -1 ? 0 : hoverIndex + 1;
          event.preventDefault();
          break;
        case 13: // enter
          filterResult.get(hoverIndex).click();
          break;
        default:
          return;
      }
      hoverIndex = (hoverIndex + filterResult.length) % filterResult.length;
      filterResult.removeClass('hover').get(hoverIndex).classList.add('hover');
      this.scrollToSong(hoverIndex);
    },
    scrollToSong: function(index = null) {
      var target;
      if (index === null) {
        target = $('.playing');
      } else {
        target = $(this.playList.find('table tr:visible')[index]);
      }

      if (!target.length) return;

      var list = this.playList;
      var table = $('.table');

      if (target.offset().top < list.offset().top) {
        list.scrollTop(target.offset().top - table.offset().top);
      } else if (target.offset().top > list.offset().top + list.height()) {
        list.scrollTop(target.offset().top - table.offset().top + target.height() - list.height());
      }
    },
  }
});


Vue.component('lyric-panel', {
  template: '#lyric-panel',
  props: ['player', 'lyricText', 'loadingSong'],

  data: function() {
    return {
      panel: null,
      panelScrollBar: null,
      lyric: {
        sentences: [],  // lyric sentences
        times: [],  // lyric time array
        activeLrcIndex: 0,
      },
      ignoreScroll: false,
      lastScrollTime: 0,
      midPos: 0,
      lrcInterval: 0,
    }
  },

  watch: {
    lyricText: function(text) {
      this.lyric.times = [];
      this.lyric.sentences = [];
      this.lyric.activeLrcIndex = 0;
      this.panelScrollBar.scrollTop(0);

      var sentences = text.trim().split('\n');
      if (sentences[0].search(/\d+:\d+\.\d+/) == -1)
        sentences[0] = '[00:00.00]' + sentences[0];
      
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

      Vue.nextTick(() => $('#lyric > div:first-child').addClass('activelrc'));
      Vue.nextTick(this.panelScrollBar.resize);
    },
    player: function(player) {
      if (!player) return;

      $(player).on('play', () => {
        this.lrcInterval = setInterval(() => {
          this.scrollLyrics();
        }, 200);
      }).on('pause', () => {
        clearInterval(this.lrcInterval);
        this.panel.stop(true, true);
      }).on('seeked', () => {
        this.scrollLyrics(true);
      });
    }
  },

  mounted: function() {
    this.panel = $('#lyricPanel');
    this.midPos = parseInt(this.panel.css('height').slice(0, -2)) / 2 - 10;
    this.panelScrollBar = this.panel.niceScroll({ enablekeyboard: false });
    this.panel.scroll(() => {
      this.ignoreScroll || (this.lastScrollTime = new Date().getTime());
    });
    $('#lyric').css('margin-top', this.midPos + 'px').css('margin-bottom', this.midPos + 'px');
  },

  methods: {
    scrollLyrics: function(immediate = false) {
      var i = locationOf(this.player.currentTime, this.lyric.times);
      if (this.lyric.activeLrcIndex == i) {
        return;
      }

      this.lyric.activeLrcIndex = i;
      $('.activelrc').removeClass('activelrc');
      var ele = $(`#lyric :nth-child(${ i + 1 })`).addClass('activelrc');

      var elapsedTime = new Date().getTime() - this.lastScrollTime;
      if (!immediate && elapsedTime < 1500) {
        return;
      }

      var offset = ele.offset().top - this.midPos;

      this.panel.stop(true, true);
      this.ignoreScroll = true;
      this.panel.animate({
        scrollTop: this.panel.scrollTop() + offset
      }, immediate ? 0 : 300, () => {
        setTimeout(() => this.ignoreScroll = false, 30);
      });
    },
    openDownload: function(event) {
      if (event.ctrlKey) {
        $(`<a href="${this.player.src}" download target="_blank">`)[0].click();
      }
    },
  },
});

Vue.component('search-panel', {
  mixins: [storageMixin],
  template: '#search-panel',
  props: ['songList'],
  inject: ['retrieve'],

  data: function() {
    return {
      storageAttrs: ['origin', 'keyword'],
      origin: CONFIG.defaultOrigin,
      keyword: '',

      origins: CONFIG.origins,
      results: {},
      result: {},
      page: 1,
      pageSize: 20,
      searching: false,
      noResult: false,

      searchApi: new Search(),
      resultPanel: null,
      resultPanelScrollBar: null,
    }
  },

  watch: {
    result: function(val) {
      this.resultPanelScrollBar && Vue.nextTick(this.resultPanelScrollBar.resize);
    },
  },

  mounted: function() {
    this.origins.forEach(each => {
      this.results[each.name] = {
        page: 0,
        keyword: '',
        songs: [],
      };
    });

    this.setOrigin(null, this.origin);
    $('[href="#' + this.origin + '"]').click();

    this.resultPanel = $('.tab-content');
    setTimeout(() => this.resultPanelScrollBar = this.resultPanel.niceScroll({ enablekeyboard: false }), 0);

    var io = new IntersectionObserver(entries => {
      entries[0].intersectionRatio > 0.005 && this.result.songs.length != 0
       && this.search();
    });
    $('.loading').each((i, el) => io.observe(el));
  },

  methods: {
    setOrigin: function(event, origin = null) {
      this.origin = origin || event.target.dataset.origin;
      this.result = this.results[this.origin];
      this.search(1);
    },
    addAndRetrieve: function(songInfo) {
      this.addToList(songInfo);
      this.retrieve(songInfo, true, true)
    },
    addToList: function(songInfo) {
      if (this.songList.some(each => each.songId === songInfo.songId)) return;
      this.songList.push(songInfo);
    },
    search: function(page, force=false) {
      if (!this.keyword) {
        this.$set(this.result, 'songs', []);
        this.result.page = 1;
        this.searching = false;
        this.noResult = true;
        return;
      }

      page = page || this.result.page + 1;
      this.noResult = false;
      
      if (force || this.keyword != this.result.keyword) {
        this.$set(this.result, 'songs', []);
      } else if(page != this.result.page + 1) {
        this.result.songs.length || (this.noResult = true);
        return;
      }

      this.searchApi.search({
        origin: this.origin, 
        keyword: this.keyword, 
        page: page, 
        pageSize: this.pageSize, 
        force,
      })
        .then(res => this.prepareResult(res, page));
    },
    prepareResult: function(data, page) {
      if (page == this.result.page + 1) {
        var newResult = this.result.songs.concat(data.songs);
        this.$delete(this.result, 'songs');
        this.$set(this.result, 'songs', newResult);
      } else {
        this.toTop();
        this.$delete(this.result, 'songs');
        this.$set(this.result, 'songs', data.songs);
      }
      this.result.page = page;
      this.result.keyword = this.keyword;
      this.searching = false;
      this.noResult = data.songs.length < this.pageSize;
    },
    toTop: function() {
      this.resultPanel.scrollTop(0);
    },
  }
});

Vue.component('control-panel', {
  mixins: [storageMixin],
  template: '#control-panel',
  props: ['player', 'songList', 'songInfo', 'playIndex', 'listenHistory', 'albumImgSrc'],
  inject: ['retrieve'],

  data: function() {
    return {
      storageAttrs: ['volume', 'playMode'],
      volume: 0.5,
      playMode: 0,

      albumImg: null,
      currentTime: 0,
      mouseParam: {
        flag: 0,
        target: 0,
      },
      proInterval: 0,
      albumInterval: 0,
    }
  },

  watch: {
    player: function(player) {
      if (!player) return;

      this.setVolume(null, this.volume);
      
      $(player).on('play', () => {
        this.proInterval = setInterval(this.updateProgress, 1000);
        this.albumInterval = setInterval(() => {
          this.albumImg.counter = (this.albumImg.counter + 1) % 360;
          this.albumImg.css('transform', 'rotate(' + this.albumImg.counter + 'deg)');
        }, 40);
      }).on('pause', () => {
        clearInterval(this.proInterval);
        clearInterval(this.albumInterval);
      }).on('ended', () => {
        this.forward();
      }).on('seeked', () => {
        this.updateProgress(true);
      });
    }
  },

  mounted: function() {
    this.toggleBtn = $('.toggle');
    this.muteBtn = $('.glyphicon-volume-down');
    this.albumImg = $('#albumImg');
    this.albumImg.counter = 0;

    $(document).on('keydown', (e) => {
      switch (e.keyCode) {
        case 38: // up
          this.setVolume(null, Math.min(1, this.volume + 0.05));
          break;
        case 40: // down
          this.setVolume(null, Math.max(0, this.volume - 0.05));
          break;
        case 37: // left
          this.player.currentTime = Math.max(0, this.player.currentTime - 3);
          break;
        case 39: // right
          this.player.currentTime = Math.min(this.songInfo.time, this.player.currentTime + 3);
          break;
        case 32: // space
          this.toggle();
          break;
      }
    });
  },

  methods: {
    setProgress: function(e) {
      var maxWidth = parseInt($('.progress-all').css('width').slice(0, -2));
      var pageX = e.type == 'touchmove' ? e.targetTouches[0].pageX : e.pageX;
      var offset = pageX - $('._progress').offset().left;
      var width = Math.max(0, Math.min(offset, maxWidth));
      var percent = width / maxWidth;
      $('._progress').css('width', width);
      $('.pro-pointer').css('left', width - 10);
      this.player.currentTime = this.currentTime = Math.floor(percent * this.songInfo.time);
    },
    updateProgress: function() {
      this.currentTime = this.player.currentTime;
      var percent = this.currentTime / this.songInfo.time;
      var width = percent * parseInt($('.progress-all').css('width').slice(0, -2));
      $('._progress').css('width', width);
      $('.pro-pointer').css('left', width - 10);
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
    },
    toggleMute: function() {
      this.player.volume = this.player.volume == 0 ? this.volume : 0;
      var width = this.player.volume * parseInt($('.volume-all').css('width').slice(0, -2));
      $('.volume-progress').css('width', width);
      $('.volume-pointer').css('left', width - 15);
      this.muteBtn.toggleClass('glyphicon-volume-down glyphicon-volume-off');
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
    backward: function(force = false) {
      if (!this.songList.length) return;
      var next = this.playIndex;
      if (this.playMode == 0 || this.playMode == 1 && force === true) {
        next = (next - 1 + this.songList.length) % this.songList.length;
      } else if (this.playMode == 2) {
        next = this.getNextRandom();
      }
      this.currentTime = 0;
      this.retrieve(this.songList[next]);
    },
    forward: function(force = false) {
      if (!this.songList.length) return;
      var next = this.playIndex;
      if (this.playMode == 0 || this.playMode == 1 && force === true) {
        next = (next + 1) % this.songList.length;
      } else if (this.playMode == 2) {
        next = this.getNextRandom();
      }
      this.currentTime = 0;
      this.retrieve(this.songList[next]);
    },
    toggle: function(action = null) {
      if (!this.songList.length) return;
      if (action === 'play' || !action && this.player.paused) {
        this.player.play();
        this.toggleBtn.addClass('glyphicon-pause').removeClass('glyphicon-play');
      } else {
        this.player.pause();
        this.toggleBtn.addClass('glyphicon-play').removeClass('glyphicon-pause');
      }
    },
    replay: function() {
      this.player.currentTime = 0;
      this.toggle('play');
    },
    changeMode: function() {
      this.playMode = (this.playMode + 1) % 3;
    },
    getNextRandom: function() {
      var half = Math.floor(this.songList.length / 2);
      var recentCnt = Math.min(this.listenHistory.length, half);
      var recentHistory = this.listenHistory.slice(-1 * recentCnt);
      var restSong = this.songList.filter(({songId}) => !recentHistory.includes(songId));
      var index = restSong.length ? Math.floor(Math.random() * restSong.length) : -1;
      var next = index != -1 ? this.songList.indexOf(restSong[index]) : this.playIndex;
      return next;
    },
  },
});



var app = new Vue({
  mixins: [storageMixin],
  el: '#app',
  data: {
    storageAttrs: ['songList', 'playIndex', 'version'],
    songList: [],
    playIndex: 0,
    version: '1.1',
    latestVersion: '1.1',

    songInfo: {},
    lyricText: '',
    loadingSong: false,
    listenHistory: [],
    albumImgSrc: CONFIG.defaultAlbum,

    failedTime: 0,
    player: null, // audio element
    retrievalApi: new Retrieval(),
  },

  provide: function() {
    return {
      retrieve: this.retrieve,
    }
  },

  created: function() {
    if (this.version != this.latestVersion) {
      this.version = this.latestVersion;
      this.songList = [];
      this.playIndex = 0;
    }
  },

  mounted: function() {
    this.player = $('#player')[0];
    Vue.nextTick(() => {
      this.songList.length > 0 && this.retrieve(this.songList[this.playIndex], false);
    });
  },

  methods: {
    retrieve: async function(songInfo, autoplay = true, force = false) {
      if (!force && songInfo == this.songInfo) {
        this.$refs.control.replay();
        return;
      }

      this.songInfo = songInfo;
      this.playIndex = this.songList.indexOf(songInfo);
      this.loadingSong = true;
      this.lyricText = '';
      this.listenHistory.push(songInfo.songId);
      this.$refs.control.toggle('pause')

      var song = await this.retrievalApi.retrieve(songInfo, 'song', force);
      songInfo.vip = song.vip !== undefined ? song.vip : songInfo.vip;
      if (songInfo.songId != this.songInfo.songId) return;

      if (song.err) {
        console.log(song.err);
        this.showTipAndForward('ERROR: ' + song.err.err_code);
        return;
      } else if (!song.url) {
        songInfo.vip = true;
        this.showTipAndForward(CONFIG.paymentTip);
        return;
      }

      this.failedTime = 0;
      this.player.src = song.url;
      this.player.oncanplay = async () => {
        this.player.oncanplay = null;
        if (songInfo.songId != this.songInfo.songId) return;

        autoplay && this.$refs.control.toggle('play');
        var lyric = await this.retrievalApi.retrieve(songInfo, 'lyric', force);
        this.loadingSong = false;
        this.lyricText = lyric.lyric;
      };

      var album = await this.retrievalApi.retrieve(songInfo, 'album', force);
      if (songInfo.songId != this.songInfo.songId) return;
      this.albumImgSrc = album.album1v1Url;
    },
    songRemoved: function(i) {
      if (this.playIndex == i) {
        this.songList.length && this.retrieve(this.songList[i % this.songList.length], !this.player.paused);
      } else {
        this.playIndex = this.songList.indexOf(this.songInfo);
      }
    },
    showTipAndForward: function(tip) {
      showTip(tip);
      this.albumImgSrc = CONFIG.defaultAlbum;
      this.loadingSong = false;
      this.failedTime += 1;
      if (this.failedTime < 3) 
        setTimeout(() => this.$refs.control.forward(true), 2000);
    },
  },
});


(function() {
  jQuery.fn.extend({
    isChildAndSelfOf: function(selector) {
      return (this.closest(selector).length > 0);
    }
  });
})();