
window.loadGraph = (json) ->
  console.log 'editor loading graph', json

  # Remove loading message
  loading = document.getElementById('loading')
  loading.parentNode.removeChild loading
  # Load graph
  editor = document.getElementById('graph')
  graph = if json.data then JSON.parse(json.data.files['noflo.json'].content) else json
  graphString = JSON.stringify(graph)
  editor.graph = graph
  # Attach editor to nav
  #nav = document.getElementById('nav')
  #nav.editor = editor

window.loadGraphEditor = () ->
  'use strict'
  editor = document.getElementById('graph')

  # Remove loading message
  loadingMessage = document.getElementById('loading-message')
  loadingMessage.innerHTML = 'loading graph data...'

  console.log 'loadGraphEditor'

  # Autolayout button
  autolayout = document.getElementById 'autolayout'
  if autolayout
    autolayout.addEventListener 'click', ->
      editor.triggerAutolayout()

  resize = ->
    editor.setAttribute 'width', window.innerWidth
    editor.setAttribute 'height', window.innerHeight*0.6
    return

  window.addEventListener 'resize', resize
  resize()

  console.log 'grapheditor setup done'

if window.polymerReady
  window.loadGraphEditor()

