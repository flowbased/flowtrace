/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

let readGraph;
exports.isBrowser = function() {
  if ((typeof process !== 'undefined') && process.execPath && process.execPath.match(/node|iojs/)) {
    return false;
  }
  return true;
};

exports.readGraph = (readGraph = function(contents, type, options) {
  let graph;
  const fbp = require('fbp');
  if (type === 'fbp') {
    graph = fbp.parse(contents, { caseSensitive: options.caseSensitive });
  } else if (type === 'object') {
    graph = contents;
  } else {
    graph = JSON.parse(contents);
  }

  // Normalize optional params
  if ((graph.inports == null)) { graph.inports = {}; }
  if ((graph.outports == null)) { graph.outports = {}; }

  return graph;
});

// node.js only
exports.readGraphFile = function(filepath, options, callback) {
  const fs = require('fs');
  const path = require('path');

  const type = path.extname(filepath).replace('.', '');
  return fs.readFile(filepath, { encoding: 'utf-8' }, function(err, contents) {
    let graph;
    if (err) { return callback(err); }
    try {
      graph = readGraph(contents, type, options);
    } catch (e) {
      return callback(e);
    }
    return callback(null, graph);
  });
};
