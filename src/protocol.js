/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// FBP protocol dependent code

const debug = require('debug')('flowtrace:protocol');

// Basically copied verbatim from fbp-spec, https://github.com/flowbased/fbp-spec/blob/master/src/protocol.coffee
exports.sendGraph = function(graph, runtime, callback) {
  let priv, process, pub;
  const main = true;

  let graphId = graph.name || graph.properties.id;
  if (!graphId) { graphId = `fixture.${common.randomString(10)}`; }

  runtime.sendGraph('clear', {
    id: graphId,
    name: graph.name,
    main,
    library: graph.properties.project || '',
    icon: graph.properties.icon || '',
    description: graph.properties.description || ''
  }
  );
  for (let name in graph.processes) {
    process = graph.processes[name];
    debug('adding node', name, process.component);
    runtime.sendGraph('addnode', {
      id: name,
      component: process.component,
      metadata: process.metadata,
      graph: graphId
    }
    );
  }
  for (let connection of Array.from(graph.connections)) {
    if (connection.src != null) {
      debug('connecting edge', connection);
      runtime.sendGraph('addedge', {
        src: {
          node: connection.src.process,
          port: connection.src.port
        },
        tgt: {
          node: connection.tgt.process,
          port: connection.tgt.port
        },
        metadata: (connection.metadata != null),
        graph: graphId
      }
      );
    } else {
      const iip = connection;
      debug('adding IIP', iip);
      runtime.sendGraph('addinitial', {
        src: {
          data: iip.data
        },
        tgt: {
          node: iip.tgt.process,
          port: iip.tgt.port
        },
        metadata: iip.metadata,
        graph: graphId
      }
      );
    }
  }
  if (graph.inports) {
    for (pub in graph.inports) {
      priv = graph.inports[pub];
      runtime.sendGraph('addinport', {
        public: pub,
        node: priv.process,
        port: priv.port,
        graph: graphId
      }
      );
    }
  }
  if (graph.outports) {
    for (pub in graph.outports) {
      priv = graph.outports[pub];
      runtime.sendGraph('addoutport', {
        public: pub,
        node: priv.process,
        port: priv.port,
        graph: graphId
      }
      );
    }
  }

  return callback(null, graphId);
};

