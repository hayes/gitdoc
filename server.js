var browserify = require('browserify')
var http = require('http')
var path = require('path')
var fs = require('fs')

http.createServer(function(req, res) {
  var url = req.url.split('?')[0]
  if(url === '/bundle.js') {
    var b = browserify({debug: true})
    b.add('./index.js')
    return b.bundle().pipe(res)
  }

  return fs.createReadStream('index.html').pipe(res)
}).listen(9966)


