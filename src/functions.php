<?php 

/**
 * start a http request and return the response text
 * @param  string $url     full url
 * @param  array  $data    encode as request body(only when POST method)
 * @param  array  $cookie  cookie header
 * @param  string $extra_headers extra headers except cookie
 * @return string          response body(plain text)
 */
function request($url, $options = [])
{
    $headers = [
        'content-type' => 'application/x-www-form-urlencoded',
        'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
    ];
    $curl = curl_init();

    if (!empty($options['mobile'])) {
        $headers['user-agent'] = 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Mobile Safari/537.36';
    }
    if (!empty($options['headers'])) {
        $headers = array_merge($headers, array_change_key_case($options['headers'], CASE_LOWER));
    }
    array_walk($headers, function(&$value, $key) {
        $value = $key . ': ' . $value;
    });
    $headers = array_values($headers);

    curl_setopt_array($curl, array(
        CURLOPT_URL => $url,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => $headers,
    ));

    if (!empty($options['body'])) {
        $data_encoded = is_array($options['body']) ? http_build_query($options['body']) : $options['body'];
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $data_encoded);
    }

    $resp = curl_exec($curl);
    $header_size = curl_getinfo($curl, CURLINFO_HEADER_SIZE);
    curl_close($curl);

    global $resp_header;
    $resp_header = [];
    $headerStr = substr($resp, 0, $header_size);
    $resp_header = explode("\r\n", trim($headerStr));
    $content = substr($resp, $header_size);
    return $content;
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
    file_put_contents($file, json_encode($cookie, JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT));
    return $cookie;
}

/**
 * encode cookie to string
 * @param  array $cookie cookie
 * @return string        encoded cookie
 */
function encode_cookie($cookie) {
    array_walk($cookie, function(&$value, $key) {
        $value = $key . '=' . $value;
    });
    return implode('; ', $cookie);
}

/**
 * customized url encode function, which is compatible with xiami
 * @param  string $component url component
 * @return string            encoded url component
 */
function url_encode($component) {
    $base_encoded = urlencode($component);
    $replacement = [
        '%3A' => ':',
        '%2C' => ',',
        '+' => '%20',
    ];
    return strtr($base_encoded, $replacement);
}

/**
 * create kugou mid, used at params or cookie
 * @return string kugou mid
 */
function createKgMid() {
    $randomStr = '';
    $splitIndex = [8, 12, 16, 20];
    for ($index=0; $index < 32; $index++) {
        if (in_array($index, $splitIndex)) {
            $randomStr .= '-';
        }
        $randomStr .= dechex(random_int(0, 15));
    }
    return md5($randomStr);
}