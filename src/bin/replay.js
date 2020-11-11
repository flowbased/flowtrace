const querystring = require('querystring');
const program = require('commander');
const os = require('os');
const open = require('opn');
const http = require('http');
const debug = require('debug')('flowtrace:replay');
const debugReceive = require('debug')('flowtrace:replay:receive');
const debugSend = require('debug')('flowtrace:replay:send');
const trace = require('../lib/trace');
const websocket = require('./websocket');

const connectionId = function (conn) {
  // FIXME: remove when https://github.com/noflo/noflo-ui/issues/293 is fixed
  let src;
  if ((conn.src != null ? conn.src.node : undefined)) {
    src = `${conn.src.node}() ${conn.src.port.toUpperCase()}`;
  } else {
    src = 'DATA';
  }
  return `${src} -> ${conn.tgt.port.toUpperCase()} ${conn.tgt.node}()`;
};

function mainGraphName(flowtrace) {
  let mainGraph = 'default/main';
  if (!flowtrace.header) {
    return mainGraph;
  }
  if (flowtrace.header.graphs && Object.keys(flowtrace.header.graphs).length) {
    return Object.keys(flowtrace.header.graphs)[0];
  }
  if (flowtrace.header.metadata && flowtrace.header.metadata.main) {
    mainGraph = flowtrace.header.metadata.main;
  }
  return mainGraph;
}

const replayEvents = function (flowtrace, sendFunc, callback) {
  flowtrace.events.forEach((event) => {
    sendFunc({
      ...event,
      payload: {
        ...event.payload,
        id: connectionId(event.payload),
        graph: event.graph || mainGraphName(flowtrace),
      },
    });
  });
  return callback(null);
};

const sendError = function (protocol, error, sendFunc) {
  sendFunc({
    protocol,
    command: 'error',
    payload: {
      message: error.message,
    },
  });
};

function componentsFromGraph(components, graph) {
  const newComponents = {
    ...components,
  };
  Object.keys(graph.processes).forEach((nodeId) => {
    const node = graph.processes[nodeId];
    if (!node.component) {
      return;
    }
    const componentDef = newComponents[node.component] || {
      name: node.component,
      icon: 'cog',
      description: '',
      subgraph: false,
      inPorts: [],
      outPorts: []
    };
    Object.keys(graph.inports).forEach((portName) => {
      const portDef = graph.inports[portName];
      if (portDef.process !== nodeId) {
        return;
      }
      componentDef.inPorts.push({
        id: portDef.port,
        type: 'all',
      });
    });
    Object.keys(graph.outports).forEach((portName) => {
      const portDef = graph.outports[portName];
      if (portDef.process !== nodeId) {
        return;
      }
      componentDef.outPorts.push({
        id: portDef.port,
        type: 'all',
      });
    });
    graph.connections.forEach((edge) => {
      if (edge.src && edge.src.process === nodeId) {
        componentDef.outPorts.push({
          id: edge.src.port,
          type: 'all',
        });
      }
      if (edge.tgt && edge.tgt.process === nodeId) {
        componentDef.inPorts.push({
          id: edge.tgt.port,
          type: 'all',
        });
      }
    });
    newComponents[node.component] = componentDef;
  });
  return newComponents;
}

const sendComponents = function (flowtrace, sendFunc, callback) {
  // XXX: should the trace also store component info??
  // maybe optional.
  const graphs = flowtrace.header != null ? flowtrace.header.graphs : {};
  let components = {};
  Object.keys(graphs).forEach((graph) => {
    components = componentsFromGraph(components, graphs[graph]);
  });

  Object.keys(components).forEach((componentName) => {
    sendFunc({
      protocol: 'component',
      command: 'component',
      payload: components[componentName],
    });
  });

  // Send all graphs as components
  sendFunc({
    protocol: 'component',
    command: 'componentsready',
    payload: Object.keys(components).length,
  });
  return callback(null);
};

const sendGraphSource = function (flowtrace, graphName, sendFunc) {
  // FIXME: get rid of this workaround for https://github.com/noflo/noflo-ui/issues/390

  const graphs = flowtrace.header != null ? flowtrace.header.graphs : {};
  const currentGraph = graphs[graphName];
  if (!currentGraph) {
    sendError('component', new Error(`Graph ${graphName} not found`), sendFunc);
    return;
  }
  let library;
  let name = graphName;
  if (graphName.indexOf('/') !== -1) {
    [library, name] = graphName.split('/');
  }
  const payload = {
    name,
    library,
    language: 'json',
    code: JSON.stringify(currentGraph, null, 2),
  };
  sendFunc({
    protocol: 'component',
    command: 'source',
    payload,
  });
};

const flowhubLiveUrl = function (options) {
  const address = `ws://${options.host}:${options.port}`;
  const query = [
    'protocol=websocket',
    `address=${address}`,
    // TODO: ID
  ];
  if (options.secret) {
    query.push(`secret=${options.secret}`);
  }

  return `${options.ide}#runtime/endpoint?${querystring.escape(query.join('&'))}`;
};

const knownUnsupportedCommands = (p, c) => (p === 'network') && (c === 'debug');

function discoverHost(preferredInterface) {
  const ifaces = os.networkInterfaces();
  let address;
  let internalAddress;

  const filter = function (connection) {
    if (connection.family !== 'IPv4') {
      return;
    }
    if (connection.internal) {
      internalAddress = connection.address;
    } else {
      ({
        address,
      } = connection);
    }
  };

  if ((preferredInterface) && Array.from(ifaces).includes(preferredInterface)) {
    ifaces[preferredInterface].forEach(filter);
  } else {
    Object.keys(ifaces).forEach((device) => {
      ifaces[device].forEach(filter);
    });
  }
  return address || internalAddress;
}

const normalizeOptions = function (options) {
  const opts = options;
  if (opts.host === 'autodetect') {
    opts.host = discoverHost();
  } else if (/autodetect\(([a-z0-9]+)\)/.exec(options.host)) {
    const match = /autodetect\(([a-z0-9]+)\)/.exec(options.host);
    opts.host = discoverHost(match[1]);
  }

  return opts;
};

const parse = function () {
  program
    .arguments('<flowtrace.json>')
    .action((flowtrace) => {
      program.trace = flowtrace;
    })
    .option('--ide <URL>', 'FBP IDE to use for live-url', String, 'http://app.flowhub.io')
    .option('--host <hostname>', 'Hostname we serve on, for live-url', String, 'autodetect')
    .option('--port <PORT>', 'Command to launch runtime under test', Number, 3333)
    .option('-n --no-open', 'Automatically open replayed trace in browser', Boolean, true)
    .parse(process.argv);

  return program;
};

exports.main = function () {
  let options = parse(process.argv);
  options = normalizeOptions(options);
  const filepath = options.trace;

  let mytrace = null;
  const httpServer = new http.Server();
  const runtime = websocket(httpServer, {});

  runtime.receive = (protocol, command, payload, context) => {
    debugReceive(protocol, command, payload);
    let status = {
      graph: mainGraphName(mytrace),
      started: false,
      running: false,
    };
    const updateStatus = (news, event) => {
      status = {
        ...status,
        ...news,
      };
      runtime.send('network', event, status, context);
    };

    const send = (e) => {
      debugSend(e.protocol, e.command, e.payload);
      runtime.send(e.protocol, e.command, e.payload, context);
    };

    switch (`${protocol}:${command}`) {
      case 'runtime:getruntime': {
        const capabilities = [
          'protocol:component', // read-only from client
          'protocol:network',
          'component:getsource',
        ];
        const info = {
          type: 'flowtrace-replay',
          version: '0.5',
          capabilities,
          allCapabilities: capabilities,
          graph: mainGraphName(mytrace),
        };
        send({
          protocol: 'runtime',
          command: 'runtime',
          payload: info,
        });
        return;
        // ignored
      }
      case 'network:getstatus': {
        send({
          protocol: 'network',
          command: 'status',
          payload: status,
        });
        return;
      }
      case 'network:start': {
        // replay our trace
        if (!mytrace) { return; }
        updateStatus({
          started: true,
          running: true,
        }, 'started');
        replayEvents(mytrace, send, () => updateStatus({
          started: true,
          running: false,
        }, 'stopped'));
        return;
      }
      case 'network:edges': {
        send({
          protocol: 'network',
          command: 'edges',
          payload: {
            edges: payload.edges,
            graph: payload.graph,
          },
        });
        return;
      }
      case 'component:list': {
        sendComponents(mytrace, send, () => { });
        return;
      }
      case 'component:getsource': {
        sendGraphSource(mytrace, payload.name, send);
        return;
      }
      default: {
        if (!knownUnsupportedCommands(protocol, command)) {
          debug('Warning: Unknown FBP protocol message', protocol, command);
        }
      }
    }
  };

  trace.loadFile(filepath, (err, tr) => {
    if (err) { throw err; }
    mytrace = tr;
    httpServer.listen(options.port, (listenErr) => {
      if (listenErr) { throw listenErr; }

      const liveUrl = flowhubLiveUrl(options);
      console.log('Trace live URL:', liveUrl);
      if (options.open) {
        open(liveUrl, (openErr) => {
          if (openErr) {
            console.log('Failed to open live URL in browser:', openErr);
            return;
          }
          console.log('Opened in browser');
        });
      }
    });
  });
};
