const Mocha = require('mocha');

const { STATE_FAILED, STATE_PASSED } = Mocha.Runnable.constants;

const {
  HOOK_TYPE_BEFORE_EACH,
  HOOK_TYPE_AFTER_EACH,
  HOOK_TYPE_AFTER_ALL,
  HOOK_TYPE_BEFORE_ALL,
} = Mocha.Suite.constants;

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
  props.forEach((prop) => {
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
  props.forEach((prop) => {
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

  copyProperties(source, suite, [
    'pending',
    'file',
    '_beforeEach',
    '_beforeAll',
    '_afterEach',
    '_afterAll',
  ]);

  copySetters(source, suite, ['timeout', 'slow', 'retries', 'enableTimeouts']);

  return suite;
}

/**
 * Creates a `Mocha.Hook` from the properties of a JSON object
 *
 * @private
 * @param {Mocha.Hook|Mocha.Test} mochaObj
 * @param {Object} source JSON object
 * @param {Mocha.Suite} parent
 * @returns {Mocha.Hook|Mocha.Test}
 * @throws {Error}
 */
function copyRunnable(mochaObj, source, parent) {
  /* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["mochaObj"] }] */
  if (source.state === STATE_FAILED && source.err == null) {
    throw new Error(
      `A failed test must have an "err" property. test: ${source.title}`
    );
  }

  mochaObj.parent = parent;

  copyProperties(source, mochaObj, [
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
  copySetters(source, mochaObj, ['timeout', 'slow', 'retries', 'currentRetry']);

  if (source.state != null && source.pending == null) {
    // ensure pending defaults to false when we have a state
    mochaObj.pending = false;
  }

  return mochaObj;
}

/**
 * Creates a `Mocha.Hook` from the properties of a JSON object
 *
 * @private
 * @param {Mocha.Suite.constants} hookType beforeEach, beforeAll, afterEach, afterAll
 * @param {Object} source JSON object
 * @param {Mocha.Suite} parent
 * @returns {Mocha.Hook}
 */
function createHook(hookType, source, parent) {
  const hook = copyRunnable(new Mocha.Hook(source.title), source, parent);
  hook.originalTitle = source.originalTitle;
  hook.ctx = parent.ctx;

  if (source.state === STATE_FAILED) {
    const { err } = hook;
    delete hook.err;

    // If the suite has some run tests
    // then only fail the hook after being run for each run test
    let testRunCount = parent.tests.filter(
      (t) => t.state === STATE_PASSED || t.state === STATE_FAILED || t.pending
    ).length;

    switch (hookType) {
      case HOOK_TYPE_BEFORE_EACH:
        break;
      case HOOK_TYPE_AFTER_EACH:
        testRunCount -= 1;
        break;
      default:
        testRunCount = 0;
    }

    const makeFnThatFailsAfter = function makeFnThatFailsAfter(failAfterCount) {
      let callCount = 0;
      return function runFailed(fn) {
        if (callCount < failAfterCount) {
          callCount += 1;
          fn();
          return;
        }
        fn(err);
      };
    };

    if (testRunCount > 0) {
      hook.run = makeFnThatFailsAfter(testRunCount);
    } else {
      hook.run = function runFailed(fn) {
        fn(err);
      };
    }
  } else {
    hook.run = function runPassed(fn) {
      fn();
    };
  }

  return hook;
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
  const test = copyRunnable(new Mocha.Test(source.title), source, parent);

  if (source.state === STATE_PASSED) {
    test.run = function runPassed(fn) {
      fn();
    };
  } else if (source.state === STATE_FAILED) {
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
    suite.tests = source.tests.map((t) => {
      return createTest(t, suite);
    });
  }

  if (source.suites) {
    suite.suites = source.suites.map((s) => {
      return parseSuite(s);
    });
  }

  [
    HOOK_TYPE_BEFORE_EACH,
    HOOK_TYPE_AFTER_EACH,
    HOOK_TYPE_AFTER_ALL,
    HOOK_TYPE_BEFORE_ALL,
  ].forEach((hookType) => {
    const prop = `_${hookType}`;
    if (source[prop] != null && source[prop].length > 0) {
      suite[prop] = source[prop].map((sourceHook) => {
        return createHook(hookType, sourceHook, suite);
      });
    }
  });

  return suite;
}

/**
 *
 * @param {string|Object}  json   JSON string or Object
 * @returns {Mocha.Suite} root suite
 * @throws {TypeError|Error}
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
