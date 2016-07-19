
exports.isBrowser = () ->
  if typeof process isnt 'undefined' and process.execPath and process.execPath.match /node|iojs/
    return false
  return true

exports.readGraph = readGraph = (contents, type, options) ->
  fbp = require 'fbp'
  if type == 'fbp'
    graph = fbp.parse contents, { caseSensitive: options.caseSensitive }
  else if type == 'object'
    graph = contents
  else
    graph = JSON.parse contents

  # Normalize optional params
  graph.inports = {} if not graph.inports?
  graph.outports = {} if not graph.outports?

  return graph

# node.js only
exports.readGraphFile = (filepath, options, callback) ->
  fs = require 'fs'
  path = require 'path'

  type = path.extname(filepath).replace('.', '')
  fs.readFile filepath, { encoding: 'utf-8' }, (err, contents) ->
    return callback err if err
    try
      graph = readGraph contents, type, options
    catch e
      return callback e
    return callback null, graph
