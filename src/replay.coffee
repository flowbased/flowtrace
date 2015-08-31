
debug = console.log # TEMP, use module

replayEvents = (trace, sendFunc, callback) ->

  for event in trace.events
    # FIXME: have to add that horrible id shit to edges
    console.log event.payload
    sendFunc event

  return callback null

sendGraph = (trace, sendFunc, callback) ->
  # FIXME: implement
  # Have to send dummy-components probably?

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

    if protocol == 'runtime' and command == 'getruntime'
      capabilities = [
        'protocol:graph' # read-only from client
        'protocol:component' # read-only from client
        'protocol:network'
      ]
      info =
        type: 'fbp-spec'
        version: '0.5'
        capabilities: capabilities
        allCapabilities: capabilities
      runtime.send 'runtime', 'runtime', info, context

    else if protocol == 'network' and command == 'getstatus'
      runtime.send 'network', 'status', status, context

    else if protocol == 'network' and command == 'start'
      # replay our trace
      send = (e) ->
        runtime.send e.protocol, e.command, e.payload, context
      return if not mytrace
      updateStatus { started: true, running: true }, 'started'
      replayEvents mytrace, send, () ->
        updateStatus { started: true, running: false }, 'stopped'

    else if protocol == 'component' and command == 'list'
      # TODO> send dummy component listing
  
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

      
