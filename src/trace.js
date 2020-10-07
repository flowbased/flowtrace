/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

let loadString;
const common = require('./common');

exports.loadString = (loadString = str => JSON.parse(str));

exports.loadFile =  function(filepath, callback) {
  const fs = require('fs');
  const path = require('path');
  return fs.readFile(filepath, { encoding: 'utf-8' }, function(err, contents) {
    let trace;
    if (err) { return err; }
    try {
      trace = loadString(contents);
    } catch (e) {
      return callback(e);
    }
    return callback(null, trace);
  });
};


exports.loadHttp =  function(url, callback) {
  if (common.isBrowser()) {
    const req = new XMLHttpRequest();
    req.addEventListener('load', function() {
      const trace = loadString(this.responseText);
      return callback(null, trace);
    });
    req.addEventListener('error', function() {
      return callback(new Error(`Failed to load ${url}: ${this.statusText}`));
    });
    req.open("get", url, true);
    return req.send();

  } else {
    throw new Error('flowtrace.trace: Loading over HTTP not supported on node.js');
  }
};
