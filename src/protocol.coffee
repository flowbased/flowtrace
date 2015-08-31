# FBP protocol dependent code

debug = console.log # require('debug')('fbp-spec:protocol')

# Basically copied verbatim from fbp-spec, https://github.com/flowbased/fbp-spec/blob/master/src/protocol.coffee
exports.sendGraph = (graph, runtime, callback) ->
  main = true

  graphId = graph.name or graph.properties.id
  graphId = "fixture.#{common.randomString(10)}" if not graphId

  runtime.sendGraph 'clear',
    id: graphId
    name: graph.name
    main: main
    library: graph.properties.project or ''
    icon: graph.properties.icon or ''
    description: graph.properties.description or ''
  for name, process of graph.processes
    debug 'adding node', name, process.component
    runtime.sendGraph 'addnode',
      id: name
      component: process.component
      metadata: process.metadata
      graph: graphId
  for connection in graph.connections
    if connection.src?
      debug 'connecting edge', connection
      runtime.sendGraph 'addedge',
        src:
          node: connection.src.process
          port: connection.src.port
        tgt:
          node: connection.tgt.process
          port: connection.tgt.port
        metadata: connection.metadata?
        graph: graphId
    else
      iip = connection
      debug 'adding IIP', iip
      runtime.sendGraph 'addinitial',
        src:
          data: iip.data
        tgt:
          node: iip.tgt.process
          port: iip.tgt.port
        metadata: iip.metadata
        graph: graphId
  if graph.inports
    for pub, priv of graph.inports
      runtime.sendGraph 'addinport',
        public: pub
        node: priv.process
        port: priv.port
        graph: graphId
  if graph.outports
    for pub, priv of graph.outports
      runtime.sendGraph 'addoutport',
        public: pub
        node: priv.process
        port: priv.port
        graph: graphId

  return callback null, graphId

