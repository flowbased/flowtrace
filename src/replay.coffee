
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

  graphs = trace.header?.graphs
  throw new Error "Trace file has no graphs in header" if not graphs or graphs.length < 1
  graphNames = Object.keys(graphs)
  console.log "WARNING: Trace file had multiple graphs, chose first one: #{graphNames}" if graphNames.length != 1
  mainGraph = graphs[graphNames[0]]

  # TODO: specify main graph in trace file
  # MAYBE: allow to override main graph (on commandline)?

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

  address = 'ws://' + options.host + ':' + options.port
  params = 'protocol=websocket&address=' + address
  params += '&secret=' + options.secret if options.secret

  return options.ide + '#runtime/endpoint?' + querystring.escape(params)

knownUnsupportedCommands = (p, c) ->
  return p == 'network' and c == 'debug'

discoverHost = (preferred_iface) ->
  os = require 'os' # node.js only

  ifaces = os.networkInterfaces()
  address = undefined
  int_address = undefined

  filter = (connection) ->
    if connection.family != 'IPv4'
      return
    if connection.internal
      int_address = connection.address
    else
      address = connection.address
    return

  if typeof preferred_iface == 'string' and preferred_iface in ifaces
    ifaces[preferred_iface].forEach filter
  else
    for device of ifaces
      ifaces[device].forEach filter
  address or int_address

normalizeOptions = (options) ->
  if options.host == 'autodetect'
    options.host = discoverHost()
  else if match = /autodetect\(([a-z0-9]+)\)/.exec(options.host)
    options.host = discoverHost(match[1])

  return options

parse = (args) ->
  program = require 'commander'

  program
    .arguments('<flowtrace.json>')
    .action( (trace) -> program.trace = trace )
    .option('--ide <URL>', 'FBP IDE to use for live-url', String, 'http://app.flowhub.io')
    .option('--host <hostname>', 'Hostname we serve on, for live-url', String, 'autodetect')
    .option('--port <PORT>', 'Command to launch runtime under test', Number, 3333)
    .option('-n --no-open', 'Automatically open replayed trace in browser', Boolean, true)
    .parse(process.argv)

  return program


exports.main = () ->
  trace = require './trace'
  http = require 'http'
  websocket = require './websocket' # FIXME: split out transport interface of noflo-runtime-*, use that directly
  open = require 'opn'

  options = parse process.argv
  options = normalizeOptions options
  filepath = options.trace

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
    httpServer.listen options.port, (err) ->
      throw err if err

      liveUrl = flowhubLiveUrl options
      console.log 'Trace live URL:', liveUrl
      if options.open
        open liveUrl, (err) ->
          if err
            console.log 'Failed to open live URL in browser:', err
          else
            console.log 'Opened in browser'
