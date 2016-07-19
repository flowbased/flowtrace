
common = require './common'

debug = require('debug')('flowtrace:performance')


svg =
  node: (type, attributes) ->
    attrs = ""
    for k, v of attributes
      attrs += "#{k}=\"#{v}\"\n"
    return "<#{type} \n#{attrs} > </#{type}>"
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

# TODO: "unit", number of seconds per SVG px should be configurable, to creating comparable timelines
renderFlow = (flow, weights) ->
  objects = []

  style =
    baseHeight: 20
    baseWidth: 100
    dividerHeightFraction: 0.2
    divider: "stroke:#000000;stroke-opacity:1"
    rect: "fill:#77cdb8;fill-opacity:1"
  style.dividerHeight = style.baseHeight*(1+style.dividerHeightFraction)

  xPos = 0
  yPos = 0
  for conn in flow
    process = conn.src.process

    weight = weights[process]
    debug 'weight', process, weight

    width = style.baseWidth * weight
    height = style.baseHeight
    nextPos = xPos + width
    rect = svg.node 'rect', { x: xPos, y: yPos, width: width, height: height, style: style.rect }
    dHeight = style.dividerHeight
    dBase = yPos-(style.baseHeight*style.dividerHeightFraction)/2
    divider = svg.node 'path', d: svg.line(nextPos, dBase, 0, dHeight), style: style.divider

    objects.push rect
    objects.push divider
    xPos = nextPos

  return objects

# Render timelines of a FBP flow, with size of each process proportional to the time spent in that process
# TODO: extract the primary (longest?) flow
# TODO: also render secondary flows
# TODO: render forks and joins nicely
# TODO: render text with name of process
# TODO: render text with time (in seconds/milliseconds)
# TODO: calculate and render percentages
# MAYBE: support average and variance? Or perhaps this should be done by the tool before. Percentile is also interesting
renderTimeline = (graph, times) ->
  objects = []

  debug 'processes', Object.keys graph.processes

  flows = extractFlows graph
  flows = flows.sort (a, b) -> a.length > b.length
  flow = flows[0] # longest

  pretty = flow.map (c) -> "#{c.src.process}.#{c.src.port} -> #{c.tgt.process}.#{c.tgt.port}"
  debug 'rendering flow', flow

  # FIXME: normalize proportions based on total number in weights
  objects = objects.concat renderFlow flow, times

  output = "<svg>#{objects.join('\n')}</svg>"

  return output

main = () ->
  [_node, _script, graphfile] = process.argv

  # TODO: accept times on commandline
  times =
    'pre': 1.00
    'queue': 2.50
    'download': 0.50
    'scale': 0.50
    'calc': 2.50
    'load': 2.50
    'save': 0.20
    'uploadOutput': 0.2

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
    out = renderTimeline graph, times
    return callback null, out

main() if not module.parent
