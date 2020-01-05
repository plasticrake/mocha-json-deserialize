// Run this with mocha:
// mocha examples/mocha.js

const mochaJsonDeserialize = require('mocha-json-deserialize');

// stringify is optional, can take a JSON string or an Object
const json = JSON.stringify({
  suite: {
    title: '',
    tests: [
      { title: 'passing test', state: 'passed' },
      { title: 'failing test', state: 'failed', err: { message: 'FAIL' } },
      { title: 'pending test', pending: true },
      {
        title: 'a slow test',
        state: 'passed',
        speed: 'slow',
        duration: 5,
        slow: 3,
      },
    ],
  },
});

const rootSuite = mochaJsonDeserialize(json);
rootSuite.title = 'A deserialized suite';

describe('A describe block', function() {
  this.addSuite(rootSuite);

  describe('A real suite', function() {
    it('should have a passing test', function() {});
  });
});
