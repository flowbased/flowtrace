/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const debug = require('debug')('flowtrace:replay');
const protocol = require('./protocol');

const connectionId = function(conn) {
  // FIXME: remove when https://github.com/noflo/noflo-ui/issues/293 is fixed
  let src;
  if ((conn.src != null ? conn.src.node : undefined)) {
    src = `${conn.src.node}() ${conn.src.port.toUpperCase()}`;
  } else {
    src = 'DATA';
  }
  return `${src} -> ${conn.tgt.port.toUpperCase()} ${conn.tgt.node}()`;
};

const replayEvents = function(trace, sendFunc, callback) {

  for (let event of Array.from(trace.events)) {
    event.payload.id = connectionId(event.payload);
    event.payload.graph = 'default/main'; // HACK

    sendFunc(event);
  }

  return callback(null);
};

const sendGraphs = function(trace, sendFunc, callback) {
  const graphs = trace.header != null ? trace.header.graphs : undefined;
  debug('sendgraphs', Object.keys(graphs));

  const runtime = {
    sendGraph(cmd, payload) {
      return sendFunc({ protocol: 'graph', command: cmd, payload });
    }
  };

  for (let name in graphs) {
    const graph = graphs[name];
    graph.name = name;
    protocol.sendGraph(graph, runtime, function(err) {
      if (err) { return callback(err); }
    });
  } // FIXME: assumes sync

  return callback(null);
};

const sendComponents = function(trace, sendFunc, callback) {

  // XXX: should the trace also store component info?? maybe optional. If optional, should graph also be?

  // TODO: Synthesize from graph and send
  const components = {};
  return callback(null);
};

const sendMainGraphSource = function(trace, sendFunc) {
  // FIXME: get rid of this workaround for https://github.com/noflo/noflo-ui/issues/390

  const graphs = trace.header != null ? trace.header.graphs : undefined;
  if (!graphs || (graphs.length < 1)) { throw new Error("Trace file has no graphs in header"); }
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
    code
  };
  return sendFunc({ protocol: 'component', command: 'source', payload: info });
};

const flowhubLiveUrl = function(options) {
  const querystring = require('querystring');

  // TEMP: default handling should be moved out
  if (!options.host) { options.host = 'localhost'; }

  const address = 'ws://' + options.host + ':' + options.port;
  let params = 'protocol=websocket&address=' + address;
  if (options.secret) { params += '&secret=' + options.secret; }

  return options.ide + '#runtime/endpoint?' + querystring.escape(params);
};

const knownUnsupportedCommands = (p, c) => (p === 'network') && (c === 'debug');

const discoverHost = function(preferred_iface) {
  const os = require('os'); // node.js only

  const ifaces = os.networkInterfaces();
  let address = undefined;
  let int_address = undefined;

  const filter = function(connection) {
    if (connection.family !== 'IPv4') {
      return;
    }
    if (connection.internal) {
      int_address = connection.address;
    } else {
      ({
        address
      } = connection);
    }
  };

  if ((typeof preferred_iface === 'string') && Array.from(ifaces).includes(preferred_iface)) {
    ifaces[preferred_iface].forEach(filter);
  } else {
    for (let device in ifaces) {
      ifaces[device].forEach(filter);
    }
  }
  return address || int_address;
};

const normalizeOptions = function(options) {
  let match;
  if (options.host === 'autodetect') {
    options.host = discoverHost();
  } else if (match = /autodetect\(([a-z0-9]+)\)/.exec(options.host)) {
    options.host = discoverHost(match[1]);
  }

  return options;
};

const parse = function(args) {
  const program = require('commander');

  program
    .arguments('<flowtrace.json>')
    .action( trace => program.trace = trace)
    .option('--ide <URL>', 'FBP IDE to use for live-url', String, 'http://app.flowhub.io')
    .option('--host <hostname>', 'Hostname we serve on, for live-url', String, 'autodetect')
    .option('--port <PORT>', 'Command to launch runtime under test', Number, 3333)
    .option('-n --no-open', 'Automatically open replayed trace in browser', Boolean, true)
    .parse(process.argv);

  return program;
};


exports.main = function() {
  const trace = require('./trace');
  const http = require('http');
  const websocket = require('./websocket'); // FIXME: split out transport interface of noflo-runtime-*, use that directly
  const open = require('opn');

  let options = parse(process.argv);
  options = normalizeOptions(options);
  const filepath = options.trace;

  let mytrace = null;
  const httpServer = new http.Server;
  const runtime = websocket(httpServer, {});

  runtime.receive = function(protocol, command, payload, context) {
    let status = { 
      started: false,
      running: false
    };
    const updateStatus = function(news, event) {
      status = news;
      return runtime.send('network', event, status, context);
    };

    const send = e => runtime.send(e.protocol, e.command, e.payload, context);

    if ((protocol === 'runtime') && (command === 'getruntime')) {
      const capabilities = [
        'protocol:graph', // read-only from client
        'protocol:component', // read-only from client
        'protocol:network',
        'component:getsource'
      ];
      const info = {
        type: 'flowtrace-replay',
        version: '0.5',
        capabilities,
        allCapabilities: capabilities,
        graph: 'default/main' // HACK, so Flowhub will ask for our graph
      };
      runtime.send('runtime', 'runtime', info, context);
      return sendGraphs(mytrace, send, function(err) {}); // XXX: right place?
        // ignored

    } else if ((protocol === 'network') && (command === 'getstatus')) {
      return runtime.send('network', 'status', status, context);

    } else if ((protocol === 'network') && (command === 'start')) {
      // replay our trace
      if (!mytrace) { return; }
      updateStatus({ started: true, running: true }, 'started');
      return replayEvents(mytrace, send, () => updateStatus({ started: true, running: false }, 'stopped'));

    } else if ((protocol === 'component') && (command === 'list')) {
      // TODO> send dummy component listing
  
    } else if ((protocol === 'component') && (command === 'getsource')) {
      return sendMainGraphSource(mytrace, send);

    } else if (knownUnsupportedCommands(protocol, command)) {
      // ignored
    } else {
      return debug('Warning: Unknown FBP protocol message', protocol, command);
    }
  };

  return trace.loadFile(filepath, function(err, tr) {
    if (err) { throw err; }
    mytrace = tr;
    return httpServer.listen(options.port, function(err) {
      if (err) { throw err; }

      const liveUrl = flowhubLiveUrl(options);
      console.log('Trace live URL:', liveUrl);
      if (options.open) {
        return open(liveUrl, function(err) {
          if (err) {
            return console.log('Failed to open live URL in browser:', err);
          } else {
            return console.log('Opened in browser');
          }
        });
      }
    });
  });
};
