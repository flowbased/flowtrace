const fs = require('fs');
require('isomorphic-fetch');

exports.loadString = (str) => JSON.parse(str);

exports.loadFile = function (filepath, callback) {
  fs.readFile(filepath, { encoding: 'utf-8' }, (err, contents) => {
    let trace;
    if (err) {
      callback(err);
      return;
    }
    try {
      trace = exports.loadString(contents);
    } catch (e) {
      callback(e);
      return;
    }
    callback(null, trace);
  });
};

exports.loadHttp = function (url, callback) {
  fetch(url)
    .then((response) => {
      if (response.status !== 200) {
        throw new Error(`Received HTTP error ${response.status}`);
      }
      return response.json();
    })
    .then(
      (content) => {
        callback(null, content);
      },
      (err) => {
        callback(err);
      },
    );
};
