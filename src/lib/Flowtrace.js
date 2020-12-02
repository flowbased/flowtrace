const CircularBuffer = require('circular-buffer');
const clone = require('clone');
const { EventEmitter } = require('events');

/**
 * @typedef {Object} PacketPort
 * @property {string} node
 * @property {string} port
 * @property {number} [index]
 */

/**
 * @typedef {Object} FlowtraceJsonHeader
 * @property {Object} metadata
 * @property {Object.<string, import("fbp-graph/src/Types").GraphJson>} graphs
 * @property {string} main
 */

/**
 * @typedef {Object} FlowtraceJsonEvent
 * @property {string} protocol
 * @property {string} command
 * @property {Object} payload
 * @property {string} graph
 * @property {Date} time
 */

/**
 * @typedef {Object} FlowtraceJson
 * @property {FlowtraceJsonHeader} header
 * @property {FlowtraceJsonEvent[]} events
 */

class Flowtrace extends EventEmitter {
  /**
   * @param {Object} metadata
   * @param {number} bufferSize
   */
  constructor(metadata, bufferSize = 400) {
    super();
    this.bufferSize = bufferSize;
    this.graphs = {};
    this.metadata = {
      ...metadata,
      start: new Date(),
    };
    this.mainGraph = null;
    this.clear();
    this.subscribe();
  }

  /**
   * @returns {void}
   */
  clear() {
    this.events = new CircularBuffer(this.bufferSize);
  }

  subscribe() {
    this.on('event', (event, payload, graph) => {
      this.events.enq({
        event,
        payload: clone(payload),
        graph,
        time: new Date(),
      });
    });
  }

  /**
   * @param {string} graphName
   * @param {import("fbp-graph").Graph} graph
   * @param {boolean} [main]
   * @returns {void}
   */
  addGraph(graphName, graph, main = false) {
    this.graphs[graphName] = graph;
    if (main) {
      this.mainGraph = graphName;
    }
  }

  /**
   * @param {string} type
   * @param {PacketPort | null} src
   * @param {PacketPort | null} tgt
   * @param {string} graph
   * @param {Object} payload
   * @returns {void}
   */
  addNetworkPacket(type, src, tgt, graph, payload) {
    this.emit('event', type, {
      ...payload,
      src,
      tgt,
    }, graph);
  }

  /**
   * @param {string} graph
   * @returns {void}
   */
  addNetworkStarted(graph) {
    this.emit('event', 'network:started', {}, graph);
  }

  /**
   * @param {string} graph
   * @returns {void}
   */
  addNetworkStopped(graph) {
    this.emit('event', 'network:stopped', {}, graph);
  }

  /**
   * @param {string} graph
   * @param {Error} error
   * @returns {void}
   */
  addNetworkError(graph, error) {
    this.emit('event', 'network:error', error, graph);
  }

  /**
   * @param {string} graph
   * @param {Error} error
   * @returns {void}
   */
  addNetworkProcessError(graph, error) {
    this.emit('event', 'network:processerror', error, graph);
  }

  /**
   * @param {string} graph
   * @returns {void}
   */
  addNetworkIcon(graph, node, icon) {
    this.emit('event', 'network:icon', {
      node,
      icon,
    }, graph);
  }

  /**
   * @param {string} graph
   * @param {Object} payload
   * @param {string} payload.message
   * @param {string} [payload.type]
   * @param {string} [payload.previewurl]
   * @returns {void}
   */
  addNetworkOutput(graph, payload) {
    this.emit('event', 'network:output', payload, graph);
  }

  /**
   * @returns {FlowtraceJson}
   */
  toJSON() {
    const events = this.events.toarray().map((event) => {
      const [protocol, command] = event.event.split(':');
      return {
        protocol,
        command,
        payload: event.payload,
        graph: event.graph,
        time: event.time,
      };
    });
    events.reverse();
    return {
      header: {
        metadata: {
          ...this.metadata,
          end: this.metadata.end || new Date(),
        },
        graphs: this.graphs,
        main: this.mainGraph,
      },
      events,
    };
  }
}

module.exports = Flowtrace;
