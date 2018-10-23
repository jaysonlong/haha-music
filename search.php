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
$keyword = $_GET['keyword'];
$page = $_GET['page'];
$pagesize = $_GET['pagesize'];
$params = $_GET['params'];
$encSecKey = $_GET['encSecKey'];
$callback = $_GET['callback'];

if ($origin == 'kugou') {
    $result = file_get_contents("http://mobilecdngz.kugou.com/api/v3/search/song?tag=1&tagtype=全部&area_code=1&plat=0&sver=5&api_ver=1&showtype=14&tag_aggr=1&version=8904&keyword=${keyword}&correct=1&page=${page}&pagesize=${pagesize}");
} else if ($origin == 'qq') {
    $result = file_get_contents("https://c.y.qq.com/soso/fcgi-bin/client_search_cp?ct=24&qqmusic_ver=1298&new_json=1&remoteplace=txt.yqq.song&searchid=66412117289907226&t=0&aggr=1&cr=1&catZhida=1&lossless=0&flag_qc=0&p=${page}&n=${pagesize}&w=${keyword}&g_tk=5381&jsonpCallback=cb&loginUin=0&hostUin=0&format=jsonp&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq&needNewCode=0");
    $result = substr($result, 3, -1);
} else if ($origin == 'xiami') {
    $result = request("https://www.xiami.com/search/song/page/${page}?key=${keyword}&is_pub=y&category=-1");
    preg_match_all('/<tr data-needpay=[\s\S]+?value="(.+?)"[\s\S]+?<td[\s\S]+?>([\s\S]+?)<\/td>[\s\S]+?<td[\s\S]+?>([\s\S]+?)<\/td>[\s\S]+?<td[\s\S]+?《([\s\S]+?)》[\s\S]+?<\/tr>/', $result, $songs, PREG_SET_ORDER);
    preg_match('/seek_counts[\s\S]+?<b>(.+?)<\/b>/', $result, $total);

    $obj = new stdClass();
    $obj->info = array();
    $obj->total = $total[1];

    foreach ($songs as $v) {
        $song = new stdClass();
        $song->hash = $v[1];
        $v[2] = preg_replace('/<[\s\S]+?>/', '', preg_replace('/>MV</', '><', $v[2]));
        $v[3] = preg_replace('/<[\s\S]+?>/', '', preg_replace('/>MV</', '><', $v[3]));
        $song->songname = preg_replace('/\s/', '', $v[2]);
        $song->singername = preg_replace('/\s/', '', $v[3]);
        $song->filename = $song->singername . ' - ' . $song->songname;
        $song->album_id = preg_replace('/<[\s\S]+?>/', '', $v[4]);
        $song->duration = '--:--';
        array_push($obj->info, $song);
    }
    $result = json_encode($obj);
} else if ($origin == '163') {
    $data = array (
        'params' => $params,
        'encSecKey' => $encSecKey
    );
    $data = http_build_query($data);
    
    $opts = array (
        'http' => array (
            'method' => 'POST',
            'header'=> "Content-Type: application/x-www-form-urlencoded",
            'content' => $data
        )
    );
    $context = stream_context_create($opts);
    $result = file_get_contents('https://music.163.com/weapi/cloudsearch/get/web?csrf_token=', false, $context);
}


if (!empty($callback)) {
    echo $callback . '(' . $result . ')';
} else {
    echo $result;
}
