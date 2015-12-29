clc = require 'cli-color'
ansiStrip = require 'cli-color/strip'

options =
  verbose: true
  duration: true
  maxDuration: 400

last = null
total = 0
slower = []

prefix = (data) ->
  if options.duration
    "#{duration(data)} #{identifier(data)}"
  else
    "#{identifier(data)}"

identifier = (data) ->
  id = connectionId data
  result = ''
  result += "#{clc.magenta.italic(data.subgraph.join(':'))} " if data.subgraph
  result += clc.blue.italic id
  return result

duration = (data) ->
  {time} = data
  current = new Date(time).getTime()
  unless last
    last = current
  dur = current - last
  last = current
  ms = dur.toFixed 0
  total += dur
  if ms > options.maxDuration
    slower.push
      duration: ms
      payload: data
    return clc.red.bold "(#{ms}ms)"
  else
    return clc.green "(#{ms}ms)"


connectionId = (data) ->
  { src, tgt } = data

  if src.process
    return "#{src.process} #{src.port.toUpperCase()} -> #{tgt.port.toUpperCase()} #{tgt.node}"
  else
    return "-> #{tgt.port.toUpperCase()} #{tgt.node}"

renderText = (msg, options={}) ->
  return null if msg.protocol != 'network'

  if msg.error
    return "TRACE ERROR: #{msg.error}"

  data = msg.payload
  text = switch msg.command
    when 'connect' then "#{identifier(data)} #{clc.yellow('CONN')} #{duration(data)}"
    when 'disconnect' then "#{identifier(data)} #{clc.yellow('DISC')} #{duration(data)}"
    when 'begingroup' then "#{identifier(data)} #{clc.cyan('< ' + data.group)} #{duration(data)}"
    when 'endgroup' then "#{identifier(data)} #{clc.cyan('> ' + data.group)} #{duration(data)}"
    when 'data'
      if options.verbose
        "#{identifier(data)} #{clc.green('DATA')} #{data.data} #{duration(data)}"
      else
        "#{identifier(data)} #{clc.green('DATA')} #{duration(data)}"
    else null

  if not process?.stdout.isTTY
    # in case we are redirected to a file or similar
    text = ansiStrip text

  return text

exports.main = () ->
  filepath = process.argv[2]
  trace = require './trace'

  trace.loadFile filepath, (err, tr) ->
    throw err if err
    for e in tr.events
      text = renderText e, options
      console.log text if text
    if options.duration
      console.log "Total duration: #{total}ms\n"
      console.log "Slower events:"
      for slow in slower
        id = identifier slow.payload
        time = clc.red.bold "(#{slow.duration}ms)"
        if not process?.stdout.isTTY
          id = ansiStrip id
          time = ansiStrip time
        console.log "#{id} #{time}"
