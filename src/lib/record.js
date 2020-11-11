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
      return Promise.all(graphsMissing.map((graphName) => fbpClient
        .protocol.component.getsource({
          name: graphName,
        })
        .then(loadGraph)
        .then((graphDefinition) => {
          const main = (graphName === mainGraph);
          tracer.addGraph(graphName, graphDefinition, main);
        })));
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
    const handler = (payload) => {
      if (payload.graph !== graph) {
        return;
      }
      console.log(payload);
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
    // TODO: Mark Flowtrace as ended
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
