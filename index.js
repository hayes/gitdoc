var Repo = require('./repo')
var altr = require('altr')
var marked = require('marked')
var qs = require('querystring')

var repo = new Repo('iojs', 'io.js')
var url = window.location.toString().split('?')
var state = qs.parse(url.splice(1).join('?'))
state.errors = []
state.ref = state.ref || 'master'
state.path = window.location.pathname
if(!state.path || state.path === '/') {
  state.path = '/README.md'
}

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
})

altr.addFilter('file', function(change) {
  return function(ref, path) {
    repo.getFile(path, ref, function(err, content) {
      if(err) return handleError(err)
      change(content)
    })
  }
})

altr.addFilter('tree', function(change) {
  return function(ref, path) {
    repo.getTree(path || '', ref, function(err, tree) {
      if(err) return handleError(err)
      change(tree)
    })
  }
})

altr.addFilter('branches', function(change) {
  return function() {
    repo.getBranches(function(err, branches) {
      if(err) return handleError(err)
      change(branches)
    })
  }
})

altr.addFilter('tags', function(change) {
  return function() {
    repo.getTags(function(err, tags) {
      if(err) return handleError(err)
      change(tags)
    })
  }
})

altr.addFilter('json', function(change) {
  return function(data) {
    try {
      data = JSON.stringify(data, null, 2)
    } catch(e){}

    change(data)
  }
})

altr.addFilter('template', function(change) {
  return function(selector) {
    var el = document.querySelector(selector)
    change(el ? el.innerHTML : '')
  }
})

altr.addFilter('marked', function(change) {
  return function(content) {
    change(marked(content || ''))
  }
})

altr.addFilter('branchLink', function(change) {
  return function(branch) {
    var url = window.location.toString().split('?')
    var state = qs.parse(url.splice(1).join('?'))
    state.ref = branch
    change(url[0] + '?' + qs.stringify(state))
  }
})

altr.addFilter('fileLink', function(change) {
  return function(ref, path) {
    var state = qs.parse(url.splice(1).join('?'))
    state.ref = ref
    change('/' + path + '?' + qs.stringify(state))
  }
})

var instance = altr(document.body, state)

function handleError(err) {
  state.errors.push(err)
  return instance.update(state)
}
