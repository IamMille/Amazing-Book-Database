
self.onmessage = function (event)
{
  if (event.data.msg === "Hello") {
    var xhr = new XMLHttpRequest();
    var key = ( event.data.num === 1 ? "T8hqd" : genApiKey() );
    var url = "https://www.forverkliga.se/JavaScript/api/crud.php?";
        url += "op=select&key=" + key;

    console.log("Worker url", url);

    xhr.open("GET", url , false);  // synchronous request
    xhr.send(null);

    self.postMessage({msg: xhr.responseText, num: event.data.num, key: key});
  }
};


function genApiKey(length=5, current='')
{
  return length ? genApiKey( --length,
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"
        .charAt( Math.floor( Math.random() * 60 ) ) + current ) : current;
}
