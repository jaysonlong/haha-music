
function insert(element, array) {
  array.splice(locationOf(element, array) + 1, 0, element);
  return array;
}

function locationOf(element, array, start, end) {
  start = start || 0;
  end = end || array.length;
  var pivot = parseInt(start + (end - start) / 2, 10);
  if (end-start <= 1 || array[pivot] === element) return pivot;
  if (array[pivot] < element) {
    return locationOf(element, array, pivot, end);
  } else {
    return locationOf(element, array, start, pivot);
  }
}

function base64decode(encrypted) {
  var rs = CryptoJS.enc.Base64.parse(encrypted);
  return rs.toString(CryptoJS.enc.Utf8);
}

function getData(url, params, type) {
  return new Promise((resolve, reject) => {
    $.get(url, params, data => {
      resolve(data);
    }, type);
  });
}

function showTip(tip, time = 1500, color = 'white', background = 'rgba(255,193,7,0.6)') {
  var $tip = $('<strong style="position:fixed;top:200px;left:50%;display:none;z-index:9999;font-size:17px;font-weight:600;padding:10px;border-radius:5px">');
  $tip.css('color', color);
  $tip.css('background', background);
  $('body').append($tip);
  $tip.text(tip).css('margin-left', - $tip.outerWidth() / 2)
    .fadeIn(time).delay(1000).fadeOut(500, () => $tip.remove());
}

function convertTime(time) {
  time = parseInt(time);
  var div = Math.floor(time / 60) || 0,
    mod = time % 60 || 0;
  div = div > 9 ? div : '0' + div;
  mod = mod > 9 ? mod : '0' + mod;
  return div + ':' + mod;
}