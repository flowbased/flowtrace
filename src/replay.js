const querystring = require('querystring');
const program = require('commander');
const os = require('os');
const open = require('opn');
const http = require('http');
const debug = require('debug')('flowtrace:replay');
const trace = require('./trace');
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

const replayEvents = function (flowtrace, sendFunc, callback) {
  flowtrace.events.forEach((event) => {
    sendFunc({
      ...event,
      payload: {
        ...event.payload,
        id: connectionId(event.payload),
        graph: 'default/main', // HACK
      },
    });
  });
  return callback(null);
};

const sendGraphs = function (flowtrace, sendFunc, callback) {
  const graphs = flowtrace.header != null ? flowtrace.header.graphs : undefined;
  debug('sendgraphs', Object.keys(graphs));

  const runtime = {
    sendGraph(cmd, payload) {
      return sendFunc({ protocol: 'graph', command: cmd, payload });
    },
  };

  Object.keys(graphs).forEach((name) => {
    const graph = graphs[name];
    graph.name = name;
    protocol.sendGraph(graph, runtime, (err) => {
      if (err) { return callback(err); }
    });
  }); // FIXME: assumes sync

  return callback(null);
};

const sendComponents = function (flowtrace, sendFunc, callback) {
  // XXX: should the trace also store component info??
  // maybe optional. If optional, should graph also be?

  // TODO: Synthesize from graph and send
  return callback(null);
};

const sendMainGraphSource = function (flowtrace, sendFunc) {
  // FIXME: get rid of this workaround for https://github.com/noflo/noflo-ui/issues/390

  const graphs = flowtrace.header != null ? flowtrace.header.graphs : undefined;
  if (!graphs || (graphs.length < 1)) { throw new Error('Trace file has no graphs in header'); }
  const graphNames = Object.keys(graphs);
  if (graphNames.length !== 1) { console.log(`WARNING: Trace file had multiple graphs, chose first one: ${graphNames}`); }
  const mainGraph = graphs[graphNames[0]];

  // TODO: specify main graph in trace file
  // MAYBE: allow to override main graph (on commandline)?

  const code = JSON.stringify(mainGraph, null, 2);
  const info = {
    name: 'main',
    library: 'default',
    language: 'json',
    code,
  };
  return sendFunc({ protocol: 'component', command: 'source', payload: info });
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
    let status = {
      started: false,
      running: false,
    };
    const updateStatus = (news, event) => {
      status = news;
      runtime.send('network', event, status, context);
    };

    const send = (e) => runtime.send(e.protocol, e.command, e.payload, context);

    if ((protocol === 'runtime') && (command === 'getruntime')) {
      const capabilities = [
        'protocol:graph', // read-only from client
        'protocol:component', // read-only from client
        'protocol:network',
        'component:getsource',
      ];
      const info = {
        type: 'flowtrace-replay',
        version: '0.5',
        capabilities,
        allCapabilities: capabilities,
        graph: 'default/main', // HACK, so Flowhub will ask for our graph
      };
      runtime.send('runtime', 'runtime', info, context);
      return;
      // ignored
    } if ((protocol === 'network') && (command === 'getstatus')) {
      runtime.send('network', 'status', status, context);
      return;
    } if ((protocol === 'network') && (command === 'start')) {
      // replay our trace
      if (!mytrace) { return; }
      updateStatus({ started: true, running: true }, 'started');
      replayEvents(mytrace, send, () => updateStatus({ started: true, running: false }, 'stopped'));
      return;
    } if ((protocol === 'component') && (command === 'list')) {
      sendComponents(mytrace, send, () => {});
    } else if ((protocol === 'component') && (command === 'getsource')) {
      sendMainGraphSource(mytrace, send);
    } else if (knownUnsupportedCommands(protocol, command)) {
      // ignored
    } else {
      debug('Warning: Unknown FBP protocol message', protocol, command);
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
