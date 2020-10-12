const chai = require('chai');
const { Flowtrace } = require('../src/index');

describe('Flowtrace class', () => {
  let tracer;
  it('should be possible to instantiate with custom buffer size', () => {
    tracer = new Flowtrace({
      type: 'example',
    }, 3);
  });
  it('should be possible to serialize to JSON', () => {
    const json = tracer.toJSON();
    chai.expect(json.header.metadata.type).to.equal('example');
    chai.expect(json.events).to.eql([]);
  });
  it('should be possible to register a packet', () => {
    tracer.addNetworkPacket('data', {}, {}, 'default/main', {
      data: true,
    });
  });
  it('should be possible to serialize to JSON', () => {
    const json = tracer.toJSON();
    chai.expect(json.header.metadata.type).to.equal('example');
    chai.expect(json.events.length).to.eql(1);
  });
});
