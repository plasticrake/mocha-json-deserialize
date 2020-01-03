const Mocha = require('mocha');

const STATE_FAILED = 'failed';
const STATE_PASSED = 'passed';
const EVENT_RUN_BEGIN = 'start';
const EVENT_RUN_END = 'end';
const EVENT_SUITE_BEGIN = 'suite';
const EVENT_SUITE_END = 'suite end';
const EVENT_TEST_END = 'test end';
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
 * @param {boolean} isRoot=false
 * @returns {external:Mocha.Suite}
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
 * @returns {external:Mocha.Test}
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

let hasStats = false;

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
      hasStats = true;
      obj.stats.start = new Date(obj.stats.start); // Convert JSON string to Date
      obj.stats.end = new Date(obj.stats.end); // Convert JSON string to Date
      this.stats = obj.stats;
    } else {
      hasStats = false;
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

  /**
   * Run the root suite and invoke `fn(failures)`
   * on completion.
   *
   * @public
   * @override
   * @memberof MochaJsonRunner
   * @param {Function} fn
   * @return {Runner} Runner instance.
   */
  run(fn = () => {}) {
    this.emit(EVENT_RUN_BEGIN);

    const runSuite = suite => {
      this.emit(EVENT_SUITE_BEGIN, suite);
      suite.tests.forEach(test => {
        switch (test.state) {
          case STATE_PASSED:
            this.emit(EVENT_TEST_PASS, test);
            if (!hasStats) this.stats.passes += 1;
            break;
          case STATE_FAILED:
            this.fail(test, test.err); // Runner will emit EVENT_TEST_FAIL
            if (!hasStats) this.stats.failures += 1;
            break;
          default:
            if (test.pending) {
              this.emit(EVENT_TEST_PENDING, test);
              if (!hasStats) this.stats.pending += 1;
            } else {
              throw new Error(
                `Unexpected test.state: ${
                  test.state
                } and not pending. test: ${test.fullTitle()}`
              );
            }
        }
        this.emit(EVENT_TEST_END, test);
        if (!hasStats) this.stats.tests += 1;
      });

      suite.suites.forEach(childSuite => {
        runSuite(childSuite);
      });

      if (!hasStats) this.stats.suites += 1;
      this.emit(EVENT_SUITE_END, suite);
    };

    runSuite(this.suite);

    this.emit(EVENT_RUN_END);

    fn(this.failures);

    return this;
  }
}

module.exports = MochaJsonRunner;
