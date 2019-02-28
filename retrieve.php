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
        $result = '';
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
        $url = sprintf($_config['retrieve_url'], $params['songId'], $params['albumId']);
        return http_request($url);
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
                $song_url = sprintf($_config['retrieve_song_url'], $params['songId']);
                $song = http_request($song_url);
                $song = substr($song, 3, -1);
                $result = $song;
                break;

            case 'lyric':
                $lyric_url = sprintf($_config['retrieve_lyric_url'], $params['songId']);
                $lyric = http_request($lyric_url, [], [], $_config['referer']);
                $lyric = substr($lyric, 3, -1);
                $result = $lyric;
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
        $cookie = explode('=', $params['cookie'], 2);
        $cookie = [$cookie[0] => $cookie[1]];
        
        switch ($params['target']) {
            case 'song':
                $song = http_request($_config['retrieve_song_url'], $data, $cookie);
                $data = json_decode($song, true);
                $data = $data['data'][0];
                if (empty($data['url'])) {
                    $song_url = sprintf($_config['retrieve_song_backup_url'], $data['id']);
                    $song = http_request($song_url);
                }
                $result = $song;
                break;

            case 'lyric':
                $lyric = http_request($_config['retrieve_lyric_url'], $data, $cookie);
                $result = $lyric;
                break;

            case 'album':
                $album = http_request($_config['retrieve_album_url'], $data, $cookie);
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
        $result = http_request($url, [], $cookie);

        $data = json_decode($result, true);
        if ($data['code'] != 'SUCCESS') {
            global $resp_header;
            $cookie = save_cookie($resp_header, $_config['cookie_file'], $_config['cookie_pattern']);
            $url = $this->compute_xiami_url($cookie);
            $result = http_request($url, [], $cookie);
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

