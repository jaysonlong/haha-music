<?php 

header("Cache-Control:max-age=" . (60 * 10));
error_reporting(0);

require 'functions.php';

/**
 * Song info retrieval
 */
class Retrieval
{
    private $params = [];
    private $origin = '';
    private $config = [];

    function __construct($arguments = NULL)
    {
        $this->set_param(is_array($arguments) ? $arguments : $_GET);
        $this->config = require 'config.php';
    }

    /**
     * set retrieve params
     * @param array $arguments
     */
    function set_param($arguments)
    {
        $this->params = $arguments;
        $this->origin = $this->params['origin'];
    }

    /**
     * retrieve the song info
     * @return string song info
     */
    function retrieve() {
        $result = '{}';
        $method = 'retrieve_' . $this->origin;
        if (!empty($this->origin) && method_exists($this, $method)) {
            $result = call_user_func([$this, $method]);
        }

        if ($this->params['callback']) {
            $result = $this->params['callback'] . '(' . $result . ')';
        }
        return $result;
    }

    /**
     * retrieve the song info of kugou
     * @return string song info
     */
    private function retrieve_kugou() {
        $_config = $this->config[$this->origin];
        $params = $this->params;

        $cookie = load_cookie($_config['cookie_file']);
        if ($cookie['date'] != date('m-d')) {
            $cookie = ['date' => date('m-d'), 'mid' => createKgMid()];
            save_cookie([], $_config['cookie_file'], '', $cookie);
        }
        $url = sprintf($_config['retrieve_url'], $params['songId'], $params['albumId'], $cookie['mid']);
        return request($url);
    }

    /**
     * retrieve the song info of qq
     * @return string song info
     */
    private function retrieve_qq() {
        $_config = $this->config[$this->origin];
        $params = $this->params;

        switch ($params['target']) {
            case 'song':
                if ($params['useMobile'] == 'true') {
                    $song_url = sprintf($_config['retrieve_song_url_mobile'], $params['songId']);
                    $page = request($song_url, [
                        'mobile' => true,
                    ]);
                    preg_match('/window.songlist *= *(.*);\s/', $page, $matches);
                    $result = $matches[1];
                } else {
                    $song_url = sprintf($_config['retrieve_song_url'], $params['songId']);
                    $result = request($song_url);
                }
                break;

            case 'lyric':
                $lyric_url = sprintf($_config['retrieve_lyric_url'], $params['songId']);
                $result = request($lyric_url, [
                    'headers' => ['referer' => $_config['referer']]
                ]);
                break;

            case 'album':
                $result = '{}';
                break;
        }
        return $result;
    }

    /**
     * retrieve the song info of wangyi
     * @return string song info
     */
    private function retrieve_wangyi() {
        $_config = $this->config[$this->origin];
        $params = $this->params;
        
        $data = [
            'params' => $params['params'],
            'encSecKey' => $params['encSecKey'],
        ];
        
        switch ($params['target']) {
            case 'song':
                $url = $params['useMobile'] == 'true' ? $_config['retrieve_song_url_mobile'] : $_config['retrieve_song_url'];
                $song = request($url, [
                    'body' => $data,
                    'headers' => ['cookie' => $params['cookie']],
                    'mobile' => $params['useMobile'] == 'true',
                ]);

                $data = json_decode($song, true);
                $data = $data['data'][0];
                if (empty($data['url'])) {
                    $song_url = sprintf($_config['retrieve_song_backup_url'], $data['id']);
                    $song = request($song_url);
                }

                $result = $song;
                break;

            case 'lyric':
                $lyric = request($_config['retrieve_lyric_url'], [
                    'body' => $data,
                    'headers' => ['cookie' => $params['cookie']],
                ]);
                $result = $lyric;
                break;

            case 'album':
                $album = request($_config['retrieve_album_url'], [
                    'body' => $data,
                    'headers' => ['cookie' => $params['cookie']],
                ]);
                $result = $album;
                break;
        }
        return $result;
    }

    /**
     * retrieve the song info of xiami
     * @return string song info
     */
    private function retrieve_xiami() {
        $_config = $this->config[$this->origin];
        $params = $this->params;

        $cookie = load_cookie($_config['cookie_file']);
        $url = $this->compute_xiami_url($cookie);
        $result = request($url, [
            'headers' => ['cookie' => encode_cookie($cookie)],
        ]);

        $data = json_decode($result, true);
        if ($data['code'] != 'SUCCESS') {
            global $resp_header;
            $cookie = save_cookie($resp_header, $_config['cookie_file'], $_config['cookie_pattern'], $cookie);
            $url = $this->compute_xiami_url($cookie);
            $result = request($url, [
                'headers' => ['cookie' => encode_cookie($cookie)],
            ]);
        }
        return $result;
    }

    /**
     * compute retrieve url of xiami
     * @param  array $cookie  pass cookie to avoid to reload the disk
     * @return string         xiami retrieve url
     */
    private function compute_xiami_url($cookie) {
        $_config = $this->config[$this->origin];
        $retrieve_param = sprintf($_config['retrieve_param'], $this->params['songId']);

        // compute retrieve url
        $token = explode('_', $cookie['xm_sg_tk'])[0];
        $encrypt_string = sprintf($_config['encrypt_string'], $token, $_config['retrieve_url_base'], $retrieve_param);
        $encrypted = md5($encrypt_string);
        $retrieve_param_encoded = url_encode($retrieve_param);
        $url = sprintf($_config['retrieve_url'], $retrieve_param_encoded, $encrypted);
        return $url;
    }
}

$retrieval = new Retrieval();
echo $retrieval->retrieve();
