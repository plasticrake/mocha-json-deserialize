# mocha-json-deserialize

[![NPM Version](https://img.shields.io/npm/v/mocha-json-deserialize.svg)](https://www.npmjs.com/package/mocha-json-deserialize)
[![Build Status](https://github.com/plasticrake/mocha-json-deserialize/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/plasticrake/mocha-json-deserialize/actions/workflows/ci.yml?query=branch%3Amaster)
[![Coverage Status](https://coveralls.io/repos/github/plasticrake/mocha-json-deserialize/badge.svg?branch=master)](https://coveralls.io/github/plasticrake/mocha-json-deserialize?branch=master)
[![CodeQL](https://github.com/plasticrake/mocha-json-deserialize/actions/workflows/codeql.yml/badge.svg)](https://github.com/plasticrake/mocha-json-deserialize/actions/workflows/codeql.yml)

☕️ **A Mocha.js JSON deserializer** ☕️

Pairs well with [mocha-json-serialize-reporter](https://github.com/plasticrake/mocha-json-serialize-reporter)!

## What is this for?

This can be used to revive the JSON output from [mocha-json-serialize-reporter](https://github.com/plasticrake/mocha-json-serialize-reporter) back into a Mocha Suite.

- This package is used by [mocha-json-runner](https://github.com/plasticrake/mocha-json-runner) to "playback" a previously run mocha test suite that has been serialized to JSON. You could then run the JSON through another Mocha reporter such as Spec.

- The deserialized Mocha Suite could also be added to an existing mocha test suite.

## Example

See [Examples](https://github.com/plasticrake/mocha-json-deserialize/tree/master/examples)

```js
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
```

```shell
mocha examples/mocha.js
```

**Output:**

```text
  A describe block
    A deserialized suite
      ✓ passing test
      1) failing test
      - pending test
      ✓ a slow test (5ms)
    A real suite
      ✓ should have a passing test


  3 passing (7ms)
  1 pending
  1 failing

  1) A describe block
       A deserialized suite
         failing test:
     FAIL
```

## License

[MIT](LICENSE)
