const CONFIG = {
  searchUrl: 'search.php',
  
  retrieveUrl: 'retrieve.php',

  origins: [
    {
      name: 'kugou',
      displayName: '酷狗',
    },
    {
      name: 'wangyi',
      displayName: '网易',
    },
    {
      name: 'xiami',
      displayName: '虾米',
    },
    {
      name: 'qq',
      displayName: 'QQ',
    },
  ],

  type: 'json', // json or jsonp

  defaultWangyiBr: 320000,

  defaultOrigin: 'kugou',

  defaultAlbum: 'images/record.png',

  defaultLyric: '没有找到歌词，请欣赏',

  paymentTip: '因版权要求，该歌曲需付费试听',
};