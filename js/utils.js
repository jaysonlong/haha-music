
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

function doAsync(task) {
  setTimeout(task, 0);
}