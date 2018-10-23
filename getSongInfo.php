<?php 

header("Cache-Control:max-age=" . (60));

error_reporting(0);

function request($url, $data = [], $cookie = '', $referer = '') {
    $method = empty($data) ? 'GET' : 'POST';
    $data = http_build_query($data);
    $header = "Content-Type: application/x-www-form-urlencoded\r\n"  . 
                "User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36" . 
                (empty($referer) ? '' : "\r\nreferer: $referer");

    $opts = array (
        'http' => array (
            'method' => $method,
            'header' => $header,
            'content' => $data,
            'timeout' => 3,
        )
    );
    if (!empty($cookie)) {
        $opts['http']['header'] .= "\r\nCookie: " . $cookie;
    }
    $context = stream_context_create($opts);
    return file_get_contents($url, false, $context);
}


$origin = $_GET['origin'];
$hash = $_GET['hash'];
$albumId = $_GET['album_id'];
$songParams = $_GET['songParams'];
$songEncSecKey = $_GET['songEncSecKey'];
$lyricParams = $_GET['lyricParams'];
$lyricEncSecKey = $_GET['lyricEncSecKey'];
$albumParams = $_GET['albumParams'];
$albumEncSecKey = $_GET['albumEncSecKey'];
$cookie = $_GET['cookie'];
$callback = $_GET['callback'];

if ($origin == 'kugou') {
    $result = request("http://www.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&album_id=${albumId}");

} else if ($origin == 'qq') {
    $song = request('https://u.y.qq.com/cgi-bin/musicu.fcg?callback=cb&g_tk=5381&jsonpCallback=cb&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0&data={"req":{"module":"CDN.SrfCdnDispatchServer","method":"GetCdnDispatch","param":{"guid":"3085745617","calltype":0,"userip":""}},"req_0":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"3085745617","songmid":["' . $hash . '"],"songtype":[0],"uin":"0","loginflag":1,"platform":"20"}},"comm":{"uin":0,"format":"json","ct":20,"cv":0}}');
    $song = json_decode(substr($song, 3, -1));

    $lyric = request("https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?callback=cb&pcachetime=1539941381632&songmid=${hash}&g_tk=5381&jsonpCallback=cb&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0", [], '', 'https://y.qq.com/portal/player.html');
    $lyric = json_decode(substr($lyric, 3, -1));

    $obj = new stdClass();
    $obj->song = $song;
    $obj->lyric = $lyric;
    $obj->album = $albumId;

    $result = json_encode($obj);

} else if ($origin == 'xiami') {
    $song = request("https://www.xiami.com/song/playlist/id/${hash}/object_name/default/object_id/0/cat/json?_ksTS=1540013874673_3440&callback=cb", [], '', 'https://www.xiami.com');
    $song = json_decode(substr($song, 4, -1)); // 响应正文开头有一个空格

    $lyric = request('http:' . $song->data->trackList[0]->lyric);

    $obj = new stdClass();
    $obj->song = $song;
    $obj->lyric = $lyric;
    $obj->album = 'http:' . $song->data->trackList[0]->album_pic;

    $result = json_encode($obj);
} else if ($origin == '163') {
    $songData = array (
        'params' => $songParams,
        'encSecKey' => $songEncSecKey,
    );
    $lyricData = array (
        'params' => $lyricParams,
        'encSecKey' => $lyricEncSecKey,
    );
    $albumData = array (
        'params' => $albumParams,
        'encSecKey' => $albumEncSecKey,
    );

    $song = request("https://music.163.com/weapi/song/enhance/player/url?csrf_token=", $songData, $cookie);
    $test = json_decode($song)->data[0];
    if (empty($test->url)) {
        $song = request("https://api.imjad.cn/cloudmusic/?type=song&id=" . $test->id);
    }
    $lyric = request("https://music.163.com/weapi/song/lyric?csrf_token=", $lyricData, $cookie);
    $album = request('https://music.163.com/weapi/v3/song/detail?csrf_token=', $albumData, $cookie);
    $song = json_decode($song);
    $lyric = json_decode($lyric);
    $album = json_decode($album);

    $obj = new stdClass();
    $obj->song = $song;
    $obj->lyric = $lyric;
    $obj->album = $album;
    
    $result = json_encode($obj);
}



if (!empty($callback)) {
    echo $callback . '(' . $result . ')';
} else {
    echo $result;
}


