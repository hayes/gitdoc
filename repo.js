var hyperquest = require('hyperquest')
var concat = require('concat-stream')
var util = require('util')
var URL = require('url')
var path = require('path')

module.exports = Repo

var defaultConfig = {
  defaultRef: 'master',
  host: 'https://api.github.com/',
  userAgent: 'gitdoc'
}

var endpoints = {
  path: '/repos/'
}

function Repo(owner, name, config) {
  if(!(this instanceof Repo)) {
    return new Repo(owner, name, config)
  }
  this.owner = owner
  this.name = name
  this.config = util._extend(Object.create(defaultConfig), config)
  this.basePath = this.config.host + 'repos/' + owner + '/' + name
}

Repo.prototype.getFile = function getFile(file, ref, cb) {
  if(!cb && typeof ref === 'function') {
    cb = ref
    ref = this.config.defaultRef
  }

  var url = this.basePath + path.join('/contents', file)
  this.request(url, ref, function(err, data) {
    if(err) {
      return cb(err)
    }

    if(Array.isArray(data)) {
      return cb(new Error('Path was not a file'))
    }

    try {
      var data = new Buffer(data.content, 'base64').toString()
    } catch(error) {
      err = error
    }

    cb(err, err ? null : data)
  })
}

Repo.prototype.getTree = function getTree(root, ref, cb) {
  var repo = this

  if(!cb && typeof ref === 'function') {
    cb = ref
    ref = this.config.defaultRef
  }

  var url = this.basePath + path.join('/contents', root)
  repo.request(url, ref, function(err, data) {
    var remaining = 0

    if(err) {
      return cb(err)
    }

    if(!Array.isArray(data)) {
      return cb(new Error('Path is not a directory'))
    }

    for(var i = 0, l = data.length; i < l; ++i) {
      if(data[i].type === 'dir') {
        ++remaining
        repo.getTree(data[i].path, gotChildren.bind(null, i))
      }
    }

    if(!remaining) {
      return cb(null, data)
    }

    function gotChildren(i, err, children) {
      if(err) {
        cb(err)
        return cb = new Function()
      }

      data[i].children = children

      if(!--remaining) {
        cb(null, data)
      }
    }
  })
}

Repo.prototype.getBranches = function getBranches(cb) {
  this.request(this.basePath + '/branches', cb)
}

Repo.prototype.getTags = function getBranches(cb) {
  this.request(this.basePath + '/tags', cb)
}

Repo.prototype.request = function request(uri, ref, cb) {
  if(!cb && typeof ref === 'function') {
    cb = ref
    ref = this.config.defaultRef
  }

  var options = {uri: uri + '?ref=' + ref, headers: {}}
  options.headers['User-Agent'] = this.config.userAgent
  var called = false

  options.withCredentials = false

  var req = hyperquest(options, function(err, res) {
    if(called) return
    called = true
    if(err) {
      return cb(err)
    }

    res.pipe(concat(function(data) {
      var err = null

      if(res.statusCode > 399 || res.statusCode < 200) {
        err = new Error('Unexpected Status Code: ' + res.statusCode)
        return cb(err, data.toString(), res)
      }

      try {
        data = JSON.parse(data)
      } catch(error) {
        data = data.toString()
        err = error
      }

      cb(err, data)
    }))
  })
}
