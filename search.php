<?php 

header("Cache-Control:max-age=" . (60));
error_reporting(0);

require 'functions.php';

/**
 * Song search
 */
class Search
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
     * set search params
     * @param array $arguments
     */
    function set_param($arguments)
    {
        $this->params = $arguments;
        $this->origin = $this->params['origin'];
    }

    /**
     * search the song
     * @return string search result
     */
    function search() {
        $result = '{}';
        $method = 'search_' . $this->origin;
        if (!empty($this->origin) && method_exists($this, $method)) {
            $result = call_user_func([$this, $method]);
        }
        
        if ($this->params['callback']) {
            $result = $this->params['callback'] . '(' . $result . ')';
        }
        return $result;
    }

    /**
     * search the song of kugou
     * @return string search result
     */
    private function search_kugou() {
        $_config = $this->config[$this->origin];
        $params = $this->params;
        $url = sprintf($_config['search_url'], $params['keyword'], $params['page'], $params['pagesize']);
        return request($url);
    }

    /**
     * search the song of qq
     * @return string search result
     */
    private function search_qq() {
        $_config = $this->config[$this->origin];
        $params = $this->params;
        $url = sprintf($_config['search_url'], url_encode($params['keyword']), $params['page'], $params['pagesize']);
        $result = request($url);
        return $result;
    }

    /**
     * search the song of wangyi
     * @return string search result
     */
    private function search_wangyi() {
        $_config = $this->config[$this->origin];
        $params = $this->params;
        $data = array (
            'params' => $params['params'],
            'encSecKey' => $params['encSecKey']
        );
        $result = request($_config['search_url'], $data);
        return $result;
    }

    /**
     * search the song of xiami
     * @return string search result
     */
    private function search_xiami() {
        global $resp_header;
        $_config = $this->config[$this->origin];
        $params = $this->params;
        
        $cookie = load_cookie($_config['cookie_file']);
        $url = $this->compute_xiami_url($cookie);
        $result = request($url, [], $cookie);
        $cookie = save_cookie($resp_header, $_config['cookie_file'], $_config['cookie_pattern'], $cookie);
        
        $data = json_decode($result, true);
        if ($data['code'] != 'SUCCESS') {
            if (isset($data['code'])) {
                $url = $this->compute_xiami_url($cookie);
                $result = request($url, [], $cookie);
                save_cookie($resp_header, $_config['cookie_file'], $_config['cookie_pattern'], $cookie);
            } else {
                $result = $this->search_xiami_backup($cookie);
            }
        }
        return $result;
    }

    /**
     * compute search url of xiami
     * @param  array $cookie  pass cookie to avoid to reload the disk
     * @return string         xiami search url
     */
    private function compute_xiami_url($cookie) {
        $_config = $this->config[$this->origin];
        $params = $this->params;
        $search_param = sprintf($_config['search_param'], $params['keyword'], $params['page'], $params['pagesize']);

        // compute search url
        $token = explode('_', $cookie['xm_sg_tk'])[0];
        $encrypt_string = sprintf($_config['encrypt_string'], $token, $_config['search_url_base'], $search_param);
        $encrypted = md5($encrypt_string);
        $search_param_encoded = url_encode($search_param);
        $url = sprintf($_config['search_url'], $search_param_encoded, $encrypted);
        return $url;
    }

    /**
     * search the song of xiami (backup)
     * @return string search result
     */
    private function search_xiami_backup() {
        $_config = $this->config[$this->origin];
        $params = $this->params;

        $search_param = sprintf($_config['search_backup_param'], url_encode($params['keyword']), $params['page'], $params['pagesize']);
        $url = $_config['search_backup_url'] . '?' . $search_param;
        $result = request($url, $search_param, [], ['referer' => $_config['referer']]);
        $data = json_decode($result, true);

        if ($data['data']['total'] != 0) {
            $songIds = [];
            foreach ($data['data']['songs'] as $song) {
                $songIds[] = $song['song_id'];
            }
            $songIdStr = implode($songIds, ',');

            $detail_url = sprintf($_config['retrieve_list_url'], $songIdStr);
            $detail_result = request($detail_url, [], [], ['referer' => $_config['referer']]);
            $detail_data = json_decode($detail_result, true);

            foreach ($data['data']['songs'] as &$song) {
                $song['pay'] = 1;
                foreach ($detail_data['data']['trackList'] as $song_detail) {
                    if ($song['song_id'] == $song_detail['songId']) {
                        $song['length'] = $song_detail['length'];
                        $song['lyric'] = $song_detail['lyric'];
                        $song['lyricInfo'] = $song_detail['lyricInfo'];
                        $song['artist_name'] = $song_detail['singers'];
                        $song['pay'] = 0;
                        break;
                    }
                }
            }
            $result = json_encode($data);
        }
        return $result;
    }
}

$search = new Search();
echo $search->search();
