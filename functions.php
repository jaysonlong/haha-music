<?php 

/**
 * start a http request and return the response text
 * @param  string $url     full url
 * @param  array  $data    encode as request body(only when POST method)
 * @param  array  $cookie  cookie header
 * @param  string $referer referer header
 * @return string          response body(plain text)
 */
function request($url, $data = [], $cookie = [], $referer = '') {
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
        array_walk($cookie, function(&$value, $key) {
            $value = $key . '=' . $value;
        });
        $cookieStr = implode('; ', $cookie);
        $opts['http']['header'] .= "\r\nCookie: " . $cookieStr;
    }
    
    $context = stream_context_create($opts);
    $resp = file_get_contents($url, false, $context);
    global $resp_header;
    $resp_header = $http_response_header;

    return $resp;
}

/**
 * load cookie from a json file
 * @param  string $file path of file
 * @return array       cookie array
 */
function load_cookie($file) {
    if (!is_file($file)) {
        return [];
    }
    return json_decode(file_get_contents($file), true);
}

/**
 * parse matched cookie from response header, save as json and return the cookie
 * @param  array $resp_header  the response header to be parsed
 * @param  string $file         path of file
 * @param  string $pattern      the regular expression to be matched
 * @param  array  $extra_cookie extra cookie to be save
 * @return array              matched cookie
 */
function save_cookie($resp_header, $file, $pattern, $extra_cookie = []) {
    $cookie = $extra_cookie;
    $path = dirname($file);
    foreach ($resp_header as $value) {
        if (preg_match($pattern, $value, $matches)) {
            $cookie[$matches[1]] = $matches[2];
        }
    }
    if (!is_dir($path)) {
        mkdir($path);
    }
    file_put_contents($file, json_encode($cookie));
    return $cookie;
}

/**
 * customized url encode function
 * @param  string $component url component
 * @return string            encoded url component
 */
function url_encode($component) {
    $base_encoded = urlencode($component);
    $replacement = [
        '%3A' => ':',
        '%2C' => ','
    ];
    return strtr($base_encoded, $replacement);
}