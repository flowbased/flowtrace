const chai = require('chai');
const flowtrace = require('../src/index');

describe('Loading Flowtrace', () => {
  it('should contain a tracer', () => {
    chai.expect(flowtrace.trace).to.be.an('object');
  });
});
