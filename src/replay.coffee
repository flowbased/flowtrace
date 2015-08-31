
debug = require('debug')('flowtrace:replay')
protocol = require './protocol'

connectionId = (conn) ->
  # FIXME: remove when https://github.com/noflo/noflo-ui/issues/293 is fixed
  if conn.src?.node
    src = "#{conn.src.node}() #{conn.src.port.toUpperCase()}"
  else
    src = 'DATA'
  return "#{src} -> #{conn.tgt.port.toUpperCase()} #{conn.tgt.node}()"

replayEvents = (trace, sendFunc, callback) ->

  for event in trace.events
    event.payload.id = connectionId event.payload
    event.payload.graph = 'default/main' # HACK

    sendFunc event

  return callback null

sendGraphs = (trace, sendFunc, callback) ->
  graphs = trace.header?.graphs
  debug 'sendgraphs', Object.keys(graphs)

  runtime =
    sendGraph: (cmd, payload) ->
      sendFunc { protocol: 'graph', command: cmd, payload: payload }

  for name, graph of graphs
    graph.name = name
    protocol.sendGraph graph, runtime, (err) ->
      return callback err if err # FIXME: assumes sync

  return callback null

sendComponents = (trace, sendFunc, callback) ->

  # XXX: should the trace also store component info?? maybe optional. If optional, should graph also be?

  # TODO: Synthesize from graph and send
  components = {}
  return callback null

sendMainGraphSource = (trace, sendFunc) ->
  # FIXME: get rid of this workaround for https://github.com/noflo/noflo-ui/issues/390

  mainGraph = trace.header?.graphs['default']

  code = JSON.stringify mainGraph, null, 2
  info =
    name: 'main'
    library: 'default'
    language: 'json'
    code: code
  sendFunc { protocol: 'component', command: 'source', payload: info }

flowhubLiveUrl = (options) ->
  querystring = require 'querystring'

  # TEMP: default handling should be moved out
  options.host = 'localhost' if not options.host
  options.ide = 'http://app.flowhub.io' if not options.ide

  address = 'ws://' + options.host + ':' + options.port
  params = 'protocol=websocket&address=' + address
  params += '&secret=' + options.secret if options.secret

  return options.ide + '#runtime/endpoint?' + querystring.escape(params)

knownUnsupportedCommands = (p, c) ->
  return p == 'network' and c == 'debug'

exports.main = () ->
  trace = require './trace'
  http = require 'http'
  websocket = require './websocket' # FIXME: split out transport interface of noflo-runtime-*, use that directly

  port = 3333
  filepath = process.argv[2]
  options =
    verbose: true

  mytrace = null
  httpServer = new http.Server
  runtime = websocket httpServer, {}

  runtime.receive = (protocol, command, payload, context) ->
    status = 
      started: false
      running: false
    updateStatus = (news, event) ->
      status = news
      runtime.send 'network', event, status, context

    send = (e) ->
      runtime.send e.protocol, e.command, e.payload, context

    if protocol == 'runtime' and command == 'getruntime'
      capabilities = [
        'protocol:graph' # read-only from client
        'protocol:component' # read-only from client
        'protocol:network'
        'component:getsource'
      ]
      info =
        type: 'fbp-spec'
        version: '0.5'
        capabilities: capabilities
        allCapabilities: capabilities
        graph: 'default/main' # HACK, so Flowhub will ask for our graph
      runtime.send 'runtime', 'runtime', info, context
      sendGraphs mytrace, send, (err) -> # XXX: right place?
        # ignored

    else if protocol == 'network' and command == 'getstatus'
      runtime.send 'network', 'status', status, context

    else if protocol == 'network' and command == 'start'
      # replay our trace
      return if not mytrace
      updateStatus { started: true, running: true }, 'started'
      replayEvents mytrace, send, () ->
        updateStatus { started: true, running: false }, 'stopped'

    else if protocol == 'component' and command == 'list'
      # TODO> send dummy component listing
  
    else if protocol == 'component' and command == 'getsource'
      sendMainGraphSource mytrace, send

    else if knownUnsupportedCommands protocol, command
      # ignored
    else
      debug 'Warning: Unknown FBP protocol message', protocol, command


  trace.loadFile filepath, (err, tr) ->
    throw err if err
    mytrace = tr
    httpServer.listen port, (err) ->
      throw err if err

      console.log 'Trace live URL:', flowhubLiveUrl { port: port }

      
