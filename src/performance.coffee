
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

renderFlow = (flow, weights) ->
  objects = []

  style =
    baseHeight: 20
    baseWidth: 100
  style.dividerHeight = style.baseHeight*1.2

  xPos = 0
  yPos = 0
  for process in flow
    width = style.baseWidth * weights[process]
    height = style.baseHeight
    nextPos = xPos + width
    rect = svg.node 'rect', { x: xPos, y: yPos, width: width, height: height, style: "fill:#f4effd;fill-opacity:1" }
    divider = svg.node 'path', d: svg.line(nextPos, yPos, 0, height), style: "stroke:#000000;stroke-opacity:1"

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

  # FIXME
  flow = ['load', 'calc', 'scale']

  # FIXME: normalize proportions based on total number in weights
  objects = objects.concat renderFlow flow, times

  output = "<svg>#{objects.join('\n')}</svg>"

  return output

main = () ->
  [_node, _script, graphfile] = process.argv

  # TODO: accept times on commandline
  times =
    'load': 1.00
    'calc': 2.50
    'scale': 0.50

  callback = (err, result) ->
    if err
      console.error err
      console.error err.stack if err.stack
      process.exit 2
    else
      debug 'output\n', result
      console.log result
      process.exit 0

  common.readGraphFile graphfile, {}, (err, graph) ->
    return callback err if err
    out = renderTimeline graph, times
    return callback null, out

main() if not module.parent
