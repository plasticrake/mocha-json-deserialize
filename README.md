# mocha-json-deserialize

[![NPM Version](https://img.shields.io/npm/v/mocha-json-deserialize.svg)](https://www.npmjs.com/package/mocha-json-deserialize)
[![Build Status](https://travis-ci.com/plasticrake/mocha-json-deserialize.svg?branch=master)](https://travis-ci.com/plasticrake/mocha-json-deserialize)
[![codecov](https://codecov.io/gh/plasticrake/mocha-json-deserialize/branch/master/graph/badge.svg)](https://codecov.io/gh/plasticrake/mocha-json-deserialize)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/plasticrake/mocha-json-deserialize.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/plasticrake/mocha-json-deserialize/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/plasticrake/mocha-json-deserialize.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/plasticrake/mocha-json-deserialize/context:javascript)

☕️ **A Mocha.js JSON deserializer** ☕️

Pairs well with [mocha-json-serialize-reporter](https://github.com/plasticrake/mocha-json-serialize-reporter)!

## What is this for?

This can be used to revive the JSON output from [mocha-json-serialize-reporter](https://github.com/plasticrake/mocha-json-serialize-reporter) back into a Mocha Suite.

- This package is used by [mocha-json-runner](https://github.com/plasticrake/mocha-json-runner) to "playback" a previously run mocha test suite that has been serialized to JSON. You could then run the JSON through another Mocha reporter such as Spec.

- The deserialized Mocha Suite could also be added to an existing mocha test suite.

## Example

See [Example](https://github.com/plasticrake/mocha-json-deserialize/tree/master/examples)

## License

[MIT](LICENSE)
