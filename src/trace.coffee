
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
