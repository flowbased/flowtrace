import { readFile } from 'fs';
import 'isomorphic-fetch';

exports.loadString = (str) => JSON.parse(str);

/**
 * @callback FlowtraceCallback
 * @param {Error | null} err
 * @param {import("./Flowtrace").FlowtraceJson} [flowtrace]
 * @returns {void}
 */

/**
 * @param {string} filepath
 * @param {FlowtraceCallback} callback
 * @returns {void}
 */
export function loadFile(filepath, callback) {
  readFile(filepath, { encoding: 'utf-8' }, (err, contents) => {
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
}

/**
 * @param {string} url
 * @param {FlowtraceCallback} callback
 * @returns {void}
 */
export function loadHttp(url, callback) {
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
}
