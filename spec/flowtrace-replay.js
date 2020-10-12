const { spawn } = require('child_process');
const { expect } = require('chai');
const path = require('path');
const fbpHealthCheck = require('fbp-protocol-healthcheck');
const fbpClient = require('fbp-client');

function healthCheck(address, callback) {
  fbpHealthCheck(address)
    .then(() => callback(), () => healthCheck(address, callback));
}

describe('flowtrace-replay CLI', () => {
  const prog = path.resolve(__dirname, '../bin/flowtrace-replay');
  describe('examples/flowtrace-without-events.json', () => {
    let runtimeProcess;
    let runtimeClient;
    after('stop runtime', (done) => {
      if (!runtimeProcess) {
        done();
        return;
      }
      process.kill(runtimeProcess.pid);
      done();
    });
    it('should start a runtime', (done) => {
      runtimeProcess = spawn(prog, [
        '--no-open',
        'examples/flowtrace-without-events.json',
      ]);
      runtimeProcess.stdout.pipe(process.stdout);
      runtimeProcess.stderr.pipe(process.stderr);
      healthCheck('ws://localhost:3333', done);
    });
    it('should be possible to connect', () => fbpClient({
      address: 'ws://localhost:3333',
      protocol: 'websocket',
    })
      .then((c) => {
        runtimeClient = c;
        return c.connect();
      }));
    it('should have a known main graph', () => {
      expect(runtimeClient.definition.graph).to.equal('helloworld');
    });
    it('should be possible to get graph sources', () => runtimeClient
      .protocol.component.getsource({
        name: runtimeClient.definition.graph,
      }));
    it('should be possible to get status of the traced network', () => runtimeClient
      .protocol.network.getstatus({
        graph: runtimeClient.definition.graph,
      }));
  });
});
