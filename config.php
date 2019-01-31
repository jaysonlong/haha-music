<?php

return [
    'kugou' => [
        'search_url' => 'http://mobilecdngz.kugou.com/api/v3/search/song?tag=1&tagtype=全部&area_code=1&plat=0&sver=5&api_ver=1&showtype=14&tag_aggr=1&version=8904&keyword=%s&correct=1&page=%s&pagesize=%s',
        'retrieve_url' => 'http://www.kugou.com/yy/index.php?r=play/getdata&hash=%s&album_id=%s',
    ],

    'qq' => [
        'referer' => 'https://y.qq.com/portal/player.html',

        'search_url' => 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&new_json=1&remoteplace=txt.yqq.song&searchid=66412117289907226&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&w=%s&p=%s&n=%s&g_tk=5381&jsonpCallback=cb&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0',

        'retrieve_song_url' => 'https://u.y.qq.com/cgi-bin/musicu.fcg?callback=cb&g_tk=5381&jsonpCallback=cb&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&data={"req":{"module":"CDN.SrfCdnDispatchServer","method":"GetCdnDispatch","param":{"guid":"3085745617","calltype":0,"userip":""}},"req_0":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"3085745617","songmid":["%s"],"songtype":[0],"uin":"0","loginflag":1,"platform":"20"}},"comm":{"uin":0,"format":"json","ct":20,"cv":0}}',
        'retrieve_lyric_url' => 'https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?callback=cb&pcachetime=1539941381632&songmid=%s&g_tk=5381&jsonpCallback=cb&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0',
    ],

    'wangyi' => [
        'search_url' => 'https://music.163.com/weapi/cloudsearch/get/web?csrf_token=',

        'retrieve_song_url' => 'https://music.163.com/weapi/song/enhance/player/url?csrf_token=',
        'retrieve_lyric_url' => 'https://music.163.com/weapi/song/lyric?csrf_token=',
        'retrieve_album_url' => 'https://music.163.com/weapi/v3/song/detail?csrf_token=',
        'retrieve_song_backup_url' => 'https://api.imjad.cn/cloudmusic/?type=song&id=%s',
    ],

    'xiami' => [
        'cookie_pattern' => '/set-cookie: (xm_sg_tk\S*)=(\S+);/',
        'cookie_file' => 'data/cookie_xiami.json',
        'encrypt_string' => '%s_xmMain_%s_%s',

        'search_url' => 'https://www.xiami.com/api/search/searchSongs?_q=%s&_s=%s',
        'search_url_base' => '/api/search/searchSongs',
        'search_param' => '{"key":"%s","pagingVO":{"page":%s,"pageSize":%s}}',

        'retrieve_url' => 'https://www.xiami.com/api/song/getPlayInfo?_q=%s&_s=%s',
        'retrieve_url_base' => '/api/song/getPlayInfo',
        'retrieve_param' => '{"songIds":[%s]}',
    ],
];