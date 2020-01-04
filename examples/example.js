const mochaJsonDeserializer = require('mocha-json-deserializer');

// stringify is optional, can take a JSON string or an Object
const json = JSON.stringify({
  suite: {
    title: '',
    tests: [
      { title: 'passing test', state: 'passed' },
      { title: 'failing test', state: 'failed', err: { message: 'FAIL' } },
      { title: 'pending test', pending: true },
    ],
  },
});

const rootSuite = mochaJsonDeserializer(json);

console.dir(rootSuite);
