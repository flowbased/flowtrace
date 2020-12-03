import { parse } from 'fbp';
import { extname } from 'path';
import { readFile } from 'fs';

export function randomString(n) {
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
}

export function isBrowser() {
  if ((typeof process !== 'undefined') && process.execPath && process.execPath.match(/node|iojs/)) {
    return false;
  }
  return true;
}

export function readGraph(contents, type, options) {
  let graph;
  if (type === 'fbp') {
    graph = parse(contents, { caseSensitive: options.caseSensitive });
  } else if (type === 'object') {
    graph = contents;
  } else {
    graph = JSON.parse(contents);
  }

  // Normalize optional params
  if ((graph.inports == null)) { graph.inports = {}; }
  if ((graph.outports == null)) { graph.outports = {}; }

  return graph;
}

// node.js only
export function readGraphFile(filepath, options, callback) {
  const type = extname(filepath).replace('.', '');
  return readFile(filepath, { encoding: 'utf-8' }, (err, contents) => {
    let graph;
    if (err) { return callback(err); }
    try {
      graph = readGraph(contents, type, options);
    } catch (e) {
      return callback(e);
    }
    return callback(null, graph);
  });
}
