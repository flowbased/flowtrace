
exports.isBrowser = () ->
  if typeof process isnt 'undefined' and process.execPath and process.execPath.match /node|iojs/
    return false
  return true

