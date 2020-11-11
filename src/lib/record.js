const fbpGraph = require('fbp-graph');
const Flowtrace = require('./Flowtrace');

function loadGraph(source) {
  return new Promise((resolve, reject) => {
    const method = (source.language === 'fbp') ? 'loadFBP' : 'loadJSON';
    fbpGraph.graph[method](source.code, (err, instance) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(instance.toJSON());
    });
  });
}

function filterGraphs(main, graphs) {
  let filtered = [];
  const mainGraph = graphs.find((g) => g.name === main);
  if (!mainGraph) {
    return filtered;
  }
  filtered.push(mainGraph);
  const graphNames = graphs.map((g) => g.name);
  Object.keys(mainGraph.processes).forEach((nodeId) => {
    const node = mainGraph.processes[nodeId];
    const graphIdx = graphNames.indexOf(node.component);
    if (graphIdx === -1) {
      // Not a subgraph
      return;
    }
    filtered = filtered.concat(filterGraphs(node.component, graphs));
  });
  return filtered;
}

function loadGraphs(fbpClient, tracer, mainGraph) {
  // TODO: Instead of fetching all subgraphs, might be more
  // efficient to load the main graph, and then recurse
  return fbpClient.protocol.component.list()
    .then((components) => components.filter((c) => (c.subgraph && c.name !== 'Graph')))
    .then((subgraphs) => {
      const graphNames = subgraphs.map((c) => c.name);
      if (graphNames.indexOf(mainGraph) === -1) {
        graphNames.push(mainGraph);
      }
      const graphsMissing = graphNames.filter((c) => {
        if (tracer.graphs[c]) {
          return false;
        }
        return true;
      });
      return Promise.all(graphsMissing
        .map((graphName) => fbpClient
          .protocol.component.getsource({
            name: graphName,
          })
          .then(loadGraph)
          .then((graphDefinition) => {
            graphDefinition.name = graphName;
            return graphDefinition;
          })))
        .then((graphs) => {
          const filtered = filterGraphs(mainGraph, graphs);
          filtered.forEach((graphDefinition) => {
            const main = (graphDefinition.name === mainGraph);
            tracer.addGraph(graphDefinition.name, graphDefinition, main);
          });
        });
    });
}

class FlowtraceRecorder {
  constructor(fbpClient) {
    this.fbpClient = fbpClient;
    this.traces = {};
    this.signalHandlers = {};
  }

  handleSignal(graph) {
    if (this.signalHandlers[graph]) {
      return this.signalHandlers[graph];
    }
    const tracer = this.traces[graph];
    const handler = (signal) => {
      if (signal.payload.graph !== graph) {
        return;
      }
      const event = `${signal.protocol}:${signal.command}`;
      switch (event) {
        case 'network:data': {
          tracer.addNetworkPacket(event, signal.payload.src, signal.payload.tgt, signal.payload.graph, signal.payload);
          return;
        }
        default: {
          // Ignore
        }
      }
    };
    this.signalHandlers[graph] = handler;
    return handler;
  }

  start(graph) {
    return this.fbpClient.connect()
      .then(() => {
        // Prep trace with runtime metadata
        this.traces[graph] = new Flowtrace({
          runtime: this.fbpClient.definition.id,
          type: this.fbpClient.definition.type,
          address: this.fbpClient.definition.address,
          repository: this.fbpClient.definition.repository,
          repositoryVersion: this.fbpClient.definition.repositoryVersion,
        });
      })
      .then(() => {
        this.fbpClient.on('signal', this.handleSignal(graph));
      })
      .then(() => loadGraphs(this.fbpClient, this.traces[graph], graph));
  }

  stop(graph) {
    if (!this.traces[graph]) {
      return Promise.resolve();
    }
    this.fbpClient.removeListener('signal', this.handleSignal(graph));
    this.traces[graph].metadata.end = new Date();
    return Promise.resolve();
  }

  dump(graph) {
    if (!this.traces[graph]) {
      // No trace for this graph yet
      return {};
    }
    return this.traces[graph].toJSON();
  }
}

module.exports = FlowtraceRecorder;
