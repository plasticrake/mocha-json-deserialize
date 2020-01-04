const Mocha = require('mocha');

const { STATE_FAILED, STATE_PASSED } = Mocha.Runnable.constants;

function isString(obj) {
  return typeof obj === 'string';
}

/**
 * Copies properties from `src` to `dest` when value is not undefined
 *
 * @private
 * @param {Object} src
 * @param {Object} dest
 * @param {string[]} props
 */
function copyProperties(src, dest, props) {
  props.forEach(prop => {
    if (src[prop] === undefined) return;
    // eslint-disable-next-line no-param-reassign
    dest[prop] = src[prop];
  });
}

/**
 * Runs setter on `dest` with property of `src` when it is not undefined
 *
 * @private
 * @param {Object} src
 * @param {Object} dest
 * @param {string[]} props
 */
function copySetters(src, dest, props) {
  props.forEach(prop => {
    if (src[prop] === undefined) return;
    dest[prop](src[prop]);
  });
}

/**
 * Creates a `Mocha.Suite` from the properties of a JSON object
 *
 * @private
 * @param {Object} source JSON object
 * @param {boolean} isRoot
 * @returns {Mocha.Suite}
 */
function createSuite(source, isRoot) {
  const suite = new Mocha.Suite(source.title, null, isRoot);

  copyProperties(source, suite, ['pending', 'file']);

  copySetters(source, suite, ['timeout', 'slow', 'retries', 'enableTimeouts']);

  return suite;
}

/**
 * Creates a `Mocha.Test` from the properties of a JSON object
 *
 * @private
 * @param {Object} source JSON object
 * @param {Mocha.Suite} parent
 * @returns {Mocha.Test}
 */
function createTest(source, parent) {
  if (source.state === STATE_FAILED && source.err == null) {
    throw new Error(
      `A failed test must have an "err" property. test: ${source.title}`
    );
  }

  const test = new Mocha.Test(source.title);
  test.parent = parent;

  copyProperties(source, test, [
    'body',
    'timedOut',
    'pending',
    'type',
    'file',
    'duration',
    'state',
    'err',
    'speed',
  ]);

  // copy setters/getters
  copySetters(source, test, ['timeout', 'slow', 'retries', 'currentRetry']);

  if (source.state != null && source.pending == null) {
    // ensure pending defaults to false when we have a state
    test.pending = false;
  }

  if (source.state === STATE_PASSED) {
    test.run = function runPassed(fn) {
      fn();
    };
  }

  if (source.state === STATE_FAILED) {
    const { err } = test;
    delete test.err;
    test.run = function runFailed(fn) {
      fn(err);
    };
  }

  return test;
}

function parseSuite(source, isRoot = false) {
  const suite = createSuite(source, source.root != null ? source.root : isRoot);

  if (source.tests) {
    suite.tests = source.tests.map(t => {
      return createTest(t, suite);
    });
  }

  if (source.suites) {
    suite.suites = source.suites.map(s => {
      return parseSuite(s);
    });
  }

  return suite;
}

/**
 *
 * @param {string|Object}  json   JSON string or Object
 * @returns {Mocha.Suite} root suite
 * @throws {TypeError}
 */
const mochaJsonDeserialize = function mochaJsonDeserialize(json) {
  let rootSuite;
  let obj;

  if (isString(json)) {
    obj = JSON.parse(json);
  } else {
    obj = json;
  }

  if (obj.suite != null) {
    rootSuite = obj.suite;
  } else if (obj.title != null) {
    rootSuite = obj;
  } else {
    throw new TypeError('Unexpected JSON object, missing root suite');
  }

  rootSuite = parseSuite(rootSuite, true);

  if (obj.stats != null) {
    obj.stats.start = new Date(obj.stats.start); // Convert JSON string to Date
    obj.stats.end = new Date(obj.stats.end); // Convert JSON string to Date
    rootSuite.stats = obj.stats;
  }

  return rootSuite;
};

module.exports = mochaJsonDeserialize;
