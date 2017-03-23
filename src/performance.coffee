
common = require './common'

fs = require 'fs'
debug = require('debug')('flowtrace:performance')


svg =
  node: (type, attributes, children) ->
    attrs = ""
    for k, v of attributes
      attrs += "#{k}=\"#{v}\"\n"
    return "<#{type} \n#{attrs} >#{children}</#{type}>"
  line: (x0, y0, width, height) ->
    return "m #{x0},#{y0} #{width},#{height}"

extractFlows = (graph) ->
  # PERF: consider keeping around the process-sorted-connections
  targetConnections = (name) ->
    graph.connections.filter (c) ->
      # IIPs don't count
      return c.src.process and c.tgt.process == name
  sourceConnections = (name) ->
    graph.connections.filter (c) ->
      # IIPs don't count
      return c.src?.process == name

  # XXX: pretty sure this has serious bugs
  walkConnectionGraph = (start, collect, flow = []) ->
    outs = sourceConnections start
    debug 'w', start, outs.length, flow.length
    for c in outs
      tgt = c.tgt.process
      subs = walkConnectionGraph tgt, collect, flow
      if subs.length == 0
        # end of a flow, collect and reset
        collect(flow) if collect
        flow = []
      else
        flow.unshift c

    return outs

  flows = []

  # find starting points
  for process, data of graph.processes
    ins = targetConnections process
    outs = sourceConnections process
    #debug 'c', process, ins.length, outs.length
    startProcess = ins.length == 0
    continue if not startProcess

    walkConnectionGraph process, (flow) ->
      flows.push flow

  return flows

# Notes on graphs and color 
# http://www.perceptualedge.com/articles/visual_business_intelligence/rules_for_using_color.pdf

renderFlow = (flow, times) ->
  objects = []

  style =
    baseHeight: 20
    dividerHeightFraction: 0.2
    divider: "stroke:#000000;stroke-opacity:1"
    rect: "fill:#77cdb8;fill-opacity:1"
    unitSeconds: 100
  style.dividerHeight = style.baseHeight*(1+style.dividerHeightFraction)


  # XXX: should times be based on process.port combo instead of just process?

  # calculate total and weights
  weights = {}
  totalTime = 0
  for conn in flow
    totalTime += times[conn.src.process]
  
  debug 'total time', totalTime

  for conn in flow
    p = conn.src.process
    weights[p] = times[p]/totalTime

  xPos = 0
  yPos = 0
  rects = []
  dividers = []
  labels = []
  for conn in flow
    p = conn.src.process
    weight = weights[p]
    debug 'weight', p, weight

    width = times[p] * style.unitSeconds
    height = style.baseHeight
    nextPos = xPos + width
    rect = svg.node 'rect', { x: xPos, y: yPos, width: width, height: height, style: style.rect }
    dHeight = style.dividerHeight
    dBase = yPos-(style.baseHeight*style.dividerHeightFraction)/2
    divider = svg.node 'path', d: svg.line(nextPos, dBase, 0, dHeight), style: style.divider

    midX = (xPos+nextPos)/2

    timeMs = (times[p]*1000).toFixed(0)
    percent = (weights[p]*100).toFixed(1)
    t = "rotate(-270)" # flips X and Y
    label = svg.node 'text', { transform: t, y: -midX, x: yPos+10 }, "#{p}: #{timeMs} ms (#{percent}%)"

    rects.push rect
    dividers.push divider
    labels.push label
    xPos = nextPos

  # need to take care of order so clipping is right
  objects = objects.concat rects
  objects = objects.concat dividers
  objects = objects.concat labels

  return objects

# Render timelines of a FBP flow, with size of each process proportional to the time spent in that process
# TODO: also render secondary flows
# MAYBE: render forks and joins
# MAYBE: support average and variance? Or perhaps this should be done by the tool before. Percentile is also interesting
renderTimeline = (graph, times) ->
  objects = []

  debug 'processes', Object.keys graph.processes

  flows = extractFlows graph
  flows = flows.sort (a, b) -> a.length > b.length
  flow = flows[0] # longest

  pretty = flow.map (c) -> "#{c.src.process}.#{c.src.port} -> #{c.tgt.process}.#{c.tgt.port}"
  debug 'rendering flow', pretty

  objects = objects.concat renderFlow flow, times

  output = "<svg>#{objects.join('\n')}</svg>"

  return output

main = () ->
  [_node, _script, graphfile, timefile] = process.argv

  if process.argv.length < 4
    console.log 'Usage: graph.fbp times.json'
    process.exit 1

  callback = (err, result) ->
    if err
      console.error err
      console.error err.stack if err.stack
      process.exit 2
    else
      debug 'output\n', result.length
      console.log result
      process.exit 0

  common.readGraphFile graphfile, {}, (err, graph) ->
    return callback err if err
    fs.readFile timefile, (err, contents) ->
      return callback err if err

      try
        times = JSON.parse contents
      catch e
        return callback e

      out = renderTimeline graph, times
      return callback null, out

main() if not module.parent
