const CircularBuffer = require('circular-buffer');

class Flowtrace {
  constructor(metadata, bufferSize = 400) {
    this.events = new CircularBuffer(bufferSize);
    this.graphs = {};
    this.metadata = {
      ...metadata,
      start: new Date(),
    };
    this.mainGraph = null;
  }

  addGraph(graphName, graph, main = false) {
    this.graphs[graphName] = graph;
    if (main) {
      this.mainGraph = graphName;
    }
  }

  addNetworkPacket(type, src, tgt, graph, payload) {
    this.events.enq({
      type,
      data: {
        ...payload,
        src,
        tgt,
      },
      graph,
      time: new Date(),
    });
  }

  addNetworkStarted(graph) {
    this.events.enq({
      type: 'network:started',
      graph,
      time: new Date(),
    });
  }

  addNetworkStopped(graph) {
    this.events.enq({
      type: 'network:stopped',
      graph,
      time: new Date(),
    });
  }

  addNetworkError(graph, error) {
    this.events.enq({
      type: 'network:error',
      graph,
      error,
      time: new Date(),
    });
  }

  addNetworkIcon(graph, node, icon) {
    this.events.enq({
      type: 'network:icon',
      graph,
      node,
      icon,
      time: new Date(),
    });
  }

  toJSON() {
    return {
      header: {
        metadata: {
          ...this.metadata,
          end: new Date(),
        },
        graphs: this.graphs,
        main: this.mainGraph,
      },
      events: this.events.toArray(),
    };
  }
}

module.exports = Flowtrace;
