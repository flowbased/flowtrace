

connectionId = (data) ->
  { src, tgt } = data

  if src.process
    return "#{src.process} #{src.port.toUpperCase()} -> #{tgt.port.toUpperCase()} #{tgt.node}"
  else
    return "-> #{tgt.port.toUpperCase()} #{tgt.node}"


renderText = (msg, options={}) ->
  return null if msg.protocol != 'network'

  clc = require 'cli-color'
  ansiStrip = require('cli-color/strip');

  identifier = (data) ->
    id = connectionId data
    result = ''
    result += "#{clc.magenta.italic(data.subgraph.join(':'))} " if data.subgraph
    result += clc.blue.italic id
    return result

  data = msg.payload
  text = switch msg.command
    when 'connect' then "#{identifier(data)} #{clc.yellow('CONN')}"
    when 'disconnect' then "#{identifier(data)} #{clc.yellow('DISC')}"
    when 'begingroup' then "#{identifier(data)} #{clc.cyan('< ' + data.group)}"
    when 'endgroup' then "#{identifier(data)} #{clc.cyan('> ' + data.group)}"
    when 'data'
      if options.verbose
        "#{identifier(data)} #{clc.green('DATA')} #{data.data}"
      else
        "#{identifier(data)} #{clc.green('DATA')}"
    else null

  if not process?.stdout.isTTY
    # in case we are redirected to a file or similar
    text = ansiStrip text

  return text

exports.main = () ->
  filepath = process.argv[2]
  trace = require './trace'

  options =
    verbose: true

  trace.loadFile filepath, (err, tr) ->
    throw err if err
    for e in tr.events
      text = renderText e, options
      console.log text if text
