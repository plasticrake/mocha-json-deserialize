const Mocha = require('mocha');

const STATE_FAILED = 'failed';
const STATE_PASSED = 'passed';
const EVENT_RUN_BEGIN = 'start';
const EVENT_RUN_END = 'end';
const EVENT_SUITE_BEGIN = 'suite';
const EVENT_SUITE_END = 'suite end';
const EVENT_TEST_END = 'test end';
const EVENT_TEST_FAIL = 'fail';
const EVENT_TEST_PASS = 'pass';
const EVENT_TEST_PENDING = 'pending';

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
 * @returns {external:Mocha.Suite}
 */
function createSuite(source) {
  const suite = new Mocha.Suite(source.title);

  copyProperties(source, suite, ['pending', 'root', 'file']);

  copySetters(source, suite, ['timeout', 'slow', 'retries', 'enableTimeouts']);

  return suite;
}

/**
 * Creates a `Mocha.Test` from the properties of a JSON object
 *
 * @private
 * @param {Object} source JSON object
 * @returns {external:Mocha.Test}
 */
function createTest(source, parent) {
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

  if (source.state === STATE_FAILED && source.err == null) {
    throw new Error(
      `A failed test must have an "err" property. test: ${source.title}`
    );
  }

  return test;
}

function parseSuite(source, isRoot) {
  const suite = createSuite(source);
  if (isRoot && source.root == null) {
    // if root was missing from json
    suite.root = true;
  }

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
 * @extends external:Mocha.Runner
 * @param {string|Object}  json   JSON string or Object
 * @param {boolean}       [delay] Whether or not to delay execution of root suite
 */
class MochaJsonRunner extends Mocha.Runner {
  constructor(json, delay) {
    let rootSuite;
    let obj;

    if (isString(json)) {
      obj = JSON.parse(json);
    } else {
      obj = json;
    }

    if (obj.suite != null) {
      rootSuite = obj.suite;
    } else if (obj.suites != null) {
      rootSuite = obj;
    } else {
      throw new TypeError('Unexpected JSON object, missing root suite');
    }

    rootSuite = parseSuite(rootSuite, true);
    super(rootSuite, delay);

    if (obj.stats != null) {
      this.stats = obj.stats;
    } else {
      const defaultDate = new Date();
      defaultDate.setTime(0);

      this.stats = {
        suites: 0,
        tests: 0,
        passes: 0,
        pending: 0,
        failures: 0,
        start: defaultDate,
        end: defaultDate,
        duration: 0,
      };
    }
  }

  run() {
    const self = this;

    self.emit(EVENT_RUN_BEGIN);

    function runSuite(suite) {
      self.emit(EVENT_SUITE_BEGIN, suite);
      suite.tests.forEach(function testFe(test) {
        switch (test.state) {
          case STATE_PASSED:
            self.emit(EVENT_TEST_PASS, test);
            self.stats.passes += 1;
            break;
          case STATE_FAILED:
            self.emit(EVENT_TEST_FAIL, test, test.err);
            self.stats.failures += 1;
            break;
          default:
            if (test.pending) {
              self.emit(EVENT_TEST_PENDING, test);
              self.stats.pending += 1;
            } else {
              throw new Error(
                `Unknown test.state: ${
                  test.state
                } and not pending. test: ${test.fullTitle()}`
              );
            }
        }
        self.emit(EVENT_TEST_END, test);
        self.stats.tests += 1;
      });

      suite.suites.forEach(function suiteFe(childSuite) {
        runSuite(childSuite);
      });

      self.stats.suites += 1;
      self.emit(EVENT_SUITE_END, suite);
    }

    runSuite(self.suite);

    self.emit(EVENT_RUN_END);
  }
}

module.exports = MochaJsonRunner;
