/* eslint class-methods-use-this: ["error", { "exceptMethods": ["send", "receive"] }] */
import { server as WebSocketServer } from 'websocket';

// XXX: Copied from https://github.com/noflo/noflo-runtime-websocket/blob/master/runtime/network.js
// should probably reuse it as-is

class WebSocketRuntime {
  constructor(options = {}) {
    this.options = options;
    this.connections = [];
  }

  /**
   * @param {string} protocol
   * @param {string} command
   * @param {Object} payload
   * @param {any} context
   * @abstract
   */
  receive(protocol, command, payload, context) {} // eslint-disable-line no-unused-vars

  /**
   * @param {string} protocol
   * @param {string} topic
   * @param {Object} payload
   * @param {any} context
   */
  send(protocol, topic, payload, context) {
    if (!context.connection || !context.connection.connected) {
      return;
    }
    context.connection.sendUTF(JSON.stringify({
      protocol,
      command: topic,
      payload,
    }));
  }

  /**
   * @param {string} protocol
   * @param {string} topic
   * @param {Object} payload
   */
  sendAll(protocol, topic, payload) {
    this.connections.forEach((connection) => {
      this.send(protocol, topic, payload, {
        connection,
      });
    });
  }
}

export default function createServer(httpServer, options) {
  const wsServer = new WebSocketServer({ httpServer });
  const runtime = new WebSocketRuntime(options);

  const handleMessage = function (message, connection) {
    if (message.type === 'utf8') {
      let contents;
      try {
        contents = JSON.parse(message.utf8Data);
      } catch (e) {
        if (e.stack) {
          console.error(e.stack);
        } else {
          console.error(`Error: ${e.toString()}`);
        }
        return;
      }
      runtime.receive(contents.protocol, contents.command, contents.payload, { connection });
    }
  };

  wsServer.on('request', (request) => {
    const subProtocol = request.requestedProtocols.indexOf('noflo') !== -1 ? 'noflo' : null;
    const connection = request.accept(subProtocol, request.origin);
    runtime.connections.push(connection);
    connection.on('message', (message) => handleMessage(message, connection));
    return connection.on('close', () => {
      if (runtime.connections.indexOf(connection) === -1) { return; }
      runtime.connections.splice(runtime.connections.indexOf(connection), 1);
    });
  });

  return runtime;
}
