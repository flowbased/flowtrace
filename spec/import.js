const chai = require('chai');
const flowtrace = require('../dist/index');

describe('Loading Flowtrace', () => {
  it('should contain a tracer', () => {
    chai.expect(flowtrace.trace).to.be.an('object');
  });
});
