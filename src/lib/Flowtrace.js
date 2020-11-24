const CircularBuffer = require('circular-buffer');
const clone = require('clone');
const { EventEmitter } = require('events');

class Flowtrace extends EventEmitter {
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

  addGraph(graphName, graph, main = false) {
    this.graphs[graphName] = graph;
    if (main) {
      this.mainGraph = graphName;
    }
  }

  addNetworkPacket(type, src, tgt, graph, payload) {
    this.emit('event', type, {
      ...payload,
      src,
      tgt,
    }, graph);
  }

  addNetworkStarted(graph) {
    this.emit('event', 'network:started', {}, graph);
  }

  addNetworkStopped(graph) {
    this.emit('event', 'network:stopped', {}, graph);
  }

  addNetworkError(graph, error) {
    this.emit('event', 'network:stopped', error, graph);
  }

  addNetworkIcon(graph, node, icon) {
    this.emit('event', 'network:icon', {
      node,
      icon,
    }, graph);
  }

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
