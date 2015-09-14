console.log 'grapheditor'

window.addEventListener 'polymer-ready', ->
  'use strict'
  # Remove loading message
  loadingMessage = document.getElementById('loading-message')
  loadingMessage.innerHTML = 'loading graph data...'

  console.log 'polymer-ready'

  window.loadGraph = (json) ->
    # Remove loading message
    loading = document.getElementById('loading')
    loading.parentNode.removeChild loading
    # Load graph
    editor = document.getElementById('editor')
    graph = if json.data then JSON.parse(json.data.files['noflo.json'].content) else json
    graphString = JSON.stringify(graph)
    editor.graph = graph
    # Attach editor to nav
    nav = document.getElementById('nav')
    nav.editor = editor
    # Simulate a library update
    setTimeout (->
      originalComponent = editor.getComponent('core/Split')
      if !originalComponent
        console.warn 'Didn\'t find component. Something is amiss.'
        return
      component = JSON.parse(JSON.stringify(originalComponent))
      component.icon = 'github'
      component.inports.push
        name: 'supercalifragilisticexpialidocious'
        type: 'boolean'
      component.outports.push
        name: 'boo'
        type: 'boolean'
      editor.registerComponent component
      return
    ), 1000
    # Simulate node icon updates
    iconKeys = Object.keys(TheGraph.FONT_AWESOME)
    window.setInterval (->
      if !editor.nofloGraph
        return
      nodes = editor.nofloGraph.nodes
      if nodes.length > 0
        randomNodeId = nodes[Math.floor(Math.random() * nodes.length)].id
        randomIcon = iconKeys[Math.floor(Math.random() * iconKeys.length)]
        editor.updateIcon randomNodeId, randomIcon
      return
    ), 1000
    # Simulate un/triggering wire animations
    animatingEdge1 = null
    animatingEdge2 = null
    window.setInterval (->
      if !editor.nofloGraph
        return
      if animatingEdge2
        editor.unanimateEdge animatingEdge2
      if animatingEdge1
        animatingEdge2 = animatingEdge1
      edges = editor.nofloGraph.edges
      if edges.length > 0
        animatingEdge1 = edges[Math.floor(Math.random() * edges.length)]
        editor.animateEdge animatingEdge1
      return
    ), 2014
    # Simulate un/triggering errors
    errorNodeId = null

    makeRandomError = ->
      if !editor.nofloGraph
        return
      if errorNodeId
        editor.removeErrorNode errorNodeId
      nodes = editor.nofloGraph.nodes
      if nodes.length > 0
        errorNodeId = nodes[Math.floor(Math.random() * nodes.length)].id
        editor.addErrorNode errorNodeId
        editor.updateErrorNodes()
      return

    window.setInterval makeRandomError, 3551
    makeRandomError()
    # Autolayout button
    document.getElementById('autolayout').addEventListener 'click', ->
      editor.triggerAutolayout()
      return
    # Toggle theme
    theme = 'dark'
    document.getElementById('theme').addEventListener 'click', ->
      theme = if theme == 'dark' then 'light' else 'dark'
      editor.theme = theme
      return
    # Focus a node
    document.getElementById('focus').addEventListener 'click', ->
      nodes = editor.nofloGraph.nodes
      randomNode = nodes[Math.floor(Math.random() * nodes.length)]
      editor.focusNode randomNode
      return
    # Refresh graph
    document.getElementById('refresh').addEventListener 'click', ->
      if !editor.nofloGraph
        return
      editor.graph = JSON.parse(graphString)
      return
    return

  body = document.querySelector('body')
  script = document.createElement('script')
  script.type = 'application/javascript'
  # Clock
  # script.src = 'https://api.github.com/gists/7135158?callback=loadGraph';
  # script.src = 'clock.json.js';
  script.src = 'photobooth.json.js'
  # Gesture object building (lots of ports!)
  # script.src = 'https://api.github.com/gists/7022120?callback=loadGraph';
  # Gesture data gathering (big graph)
  # script.src = 'https://api.github.com/gists/7022262?callback=loadGraph';
  # Edge algo test
  #script.src = 'https://api.github.com/gists/6890344?callback=loadGraph';
  body.appendChild script
  # Resize to fill window and also have explicit w/h attributes
  editor = document.getElementById('editor')

  resize = ->
    editor.setAttribute 'width', window.innerWidth
    editor.setAttribute 'height', window.innerHeight
    return

  window.addEventListener 'resize', resize
  resize()
  return

  console.log 'grapheditor setup done'

