
common = require './common'

exports.loadString = loadString = (str) ->
  return JSON.parse str

exports.loadFile =  (filepath, callback) ->
  fs = require 'fs'
  path = require 'path'
  fs.readFile filepath, { encoding: 'utf-8' }, (err, contents) ->
    return err if err
    try
      trace = loadString contents
    catch e
      return callback e
    return callback null, trace


exports.loadHttp =  (url, callback) ->
  if common.isBrowser()
    req = new XMLHttpRequest();
    req.addEventListener 'load', () ->
      trace = loadString @responseText
      return callback null, trace
    req.addEventListener 'error', () ->
      return callback new Error "Failed to load #{url}: #{@statusText}"
    req.open "get", url, true
    req.send()

  else
    throw new Error 'flowtrace.trace: Loading over HTTP not supported on node.js'
