const fbp = require('fbp');
const path = require('path');

exports.randomString = function (n) {
  let idx;
  let j;
  let ref;
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (j = 0, ref = n; ref >= 0 ? j < ref : j > ref; ref >= 0 ? j += 1 : j -= 1) {
    idx = Math.floor(Math.random() * possible.length);
    text += possible.charAt(idx);
  }

  return text;
};

exports.isBrowser = function isBrowser() {
  if ((typeof process !== 'undefined') && process.execPath && process.execPath.match(/node|iojs/)) {
    return false;
  }
  return true;
};

exports.readGraph = function readGraph(contents, type, options) {
  let graph;
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
};

// node.js only
exports.readGraphFile = function readGraphFile(filepath, options, callback) {
  // eslint-disable-next-line global-require
  const fs = require('fs');
  const type = path.extname(filepath).replace('.', '');
  return fs.readFile(filepath, { encoding: 'utf-8' }, (err, contents) => {
    let graph;
    if (err) { return callback(err); }
    try {
      graph = exports.readGraph(contents, type, options);
    } catch (e) {
      return callback(e);
    }
    return callback(null, graph);
  });
};
