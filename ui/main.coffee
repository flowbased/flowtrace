flowtrace = require 'flowtrace/src/index' if not flowtrace

React = window.React

# flowtrace UI library
widgets = {} # TEMP: move into own file

# Detailed view of selected data
{ div, label, span, textarea } = React.DOM
class DetailsClass
  render: () ->
    if @props.selection
      data = JSON.stringify @props.selection.payload.data, null, 2
    else
      data = ''

    textarea { className: 'data', readOnly: true, spellcheck: false }, data

widgets.Details = React.createFactory DetailsClass

edgeId = (p) ->
  if p.src?.node
    id = "#{p.src.node}.#{p.src.port.toUpperCase()} -> #{p.tgt.node}.#{p.tgt.port.toUpperCase()}"
  else
    id = "DATA -> #{p.tgt.node}.#{p.tgt.port.toUpperCase()}"

getDataEvents = (edges, trace) ->
  events = []

  # FIXME: use proper timestamps


  trace.events.forEach (event, idx) ->
    return if event.command != 'data'

    start = moment(event.payload.time)
    group = edges.indexOf(edgeId(event.payload))
    data = event.payload.data
    events.push
      group: group,
      content: '<span style="color:#97B0F8;">' + data  + '</span>'
      start: start,
      type: 'point'
  return events

clone = (obj) ->
  return JSON.parse JSON.stringify obj

edgeConnections = (edges, trace) ->
  pairs = []

  # parser state
  connections = {}
  for id in edges
    connections[id] =
      connect: null
      disconnect: null

  for event in trace.events
    id = edgeId event.payload
    conn = connections[id]
    if event.command == 'connect'
      throw new Error 'disconnect before connect' if conn.disconnect
      conn.connect = event
    else if event.command == 'disconnect'
      throw new Error 'no connect before disconnec' if not conn.connect
      conn.disconnect = event
      pairs.push clone conn
    else
      # ignore

  events = []
  pairs.forEach (pair, idx) ->
    group = edges.indexOf(edgeId(pair.connect.payload))
    start = moment(pair.connect.payload.time)
    end = moment(pair.connect.payload.time).add('1', 'millisecond') # HACK, to make range show
  
    console.log 'c', start, end

    events.push
      type: 'background'
      content: ' '
      start: start
      end: end
      group: group

  return events

getEdges = (trace) ->
  edges = []
  for e in trace.events
    id = edgeId e.payload
    edges.push id if edges.indexOf(id) < 0
  return edges

class TimelineClass
  render: () ->
    
    # TODO: allow being influenced by selection
    edges = getEdges @props.trace

    # add edges as groups, for one row each
    groups = new vis.DataSet()
    for i in [0...edges.length]
      groups.add { id: i, content: edges[i] }

    events = getDataEvents(edges, @props.trace).concat edgeConnections(edges, @props.trace)
    items = new vis.DataSet()
    events.forEach (e, idx) ->
      e.id = idx
      items.add e

    console.log 'events', events

    # 
    container = document.getElementById('timeline'); # FIXME: integrate with React mount
    clearChildren container
    options =
      groupOrder: 'id'
      timeAxis: {scale: 'millisecond', step: 1}

    timeline = new vis.Timeline(container);
    timeline.setOptions options
    timeline.setGroups groups 
    timeline.setItems items

    timeline.on 'select', (properties) ->
      console.log 'selected', properties

    (div {}, [
      label { className: 'name' }, ''
    ])

widgets.Timeline = React.createFactory TimelineClass

getEvents = (trace, predicate) ->
  trace.events.filter predicate


# DOM helpers
id = (name) ->
  document.getElementById name

clearChildren = (node) ->
  while node.firstChild
    node.removeChild node.firstChild
  return true

# Main
main = () ->
  console.log 'main'

  updateApp = (app) ->
    React.render (widgets.Timeline {trace: app.trace}), id('scratch')
    React.render (widgets.Details {trace: app.trace, selection: app.selection}), id('details')
    console.log 'render'

  changeTrace = (err, trace) ->
    console.log 'load', err, Object.keys(trace)
    dataEvents = getEvents(trace, (e) -> e.command == 'data')
    app =
      trace: trace
      selection: dataEvents[dataEvents.length-1]
    updateApp app

    mainGraph = trace.header.graphs['default'] # FIXME: don't hardcode
    window.loadGraph mainGraph # to graph editor

  id('loadfileinput').addEventListener 'change', (event) ->
    file = event.target.files[0]
    console.log 'loadfile', file.name
    reader = new FileReader
    reader.onload = (e) ->
      contents = reader.result
      trace = flowtrace.trace.loadString contents
      changeTrace null, trace
    reader.readAsText(file)

  loadDefault = () ->
    defaultTrace = '/11581-17566-19lvg3o.json'
    flowtrace.trace.loadHttp defaultTrace, changeTrace
  setTimeout loadDefault, 100
  console.log 'main done'

main()
