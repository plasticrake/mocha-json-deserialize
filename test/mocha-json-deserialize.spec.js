const fs = require('fs');

const { expect } = require('chai');
const Mocha = require('mocha');
const JsonSerializeReporter = require('mocha-json-serialize-reporter');
const path = require('path');
const rewire = require('rewire');
const sinon = require('sinon');

const mochaJsonDeserialize = rewire('../lib/mocha-json-deserialize');

const { STATE_FAILED, STATE_PASSED } = Mocha.Runnable.constants;

async function runJsonSerializeReporter(rootSuite, reporterOptions) {
  const mocha = new Mocha();
  mocha.reporter(JsonSerializeReporter, reporterOptions);

  mocha.suite = rootSuite;

  const stdout = [];
  sinon.stub(process.stdout, 'write').callsFake(o => {
    stdout.push(o);
  });

  await new Promise((resolve, reject) => {
    try {
      mocha.run(resolve);
    } catch (err) {
      sinon.restore();
      reject(err);
    }
  });

  sinon.restore();
  return stdout.join('\n');
}

describe('MochaJsonDeserialize', function() {
  it('should accept an Object', function() {
    expect(
      mochaJsonDeserialize({ suite: { title: 'My Root Suite' } })
    ).to.have.property('title', 'My Root Suite');
  });

  it('should accept a JSON string', function() {
    expect(
      mochaJsonDeserialize('{ "suite": { "title": "My Root Suite" } }')
    ).to.have.property('title', 'My Root Suite');
  });

  it('should accept a root suite under "suite" property', function() {
    expect(
      mochaJsonDeserialize({ suite: { title: 'My Root Suite' } })
    ).to.have.property('title', 'My Root Suite');
  });

  it('should accept a root suite directly', function() {
    expect(mochaJsonDeserialize({ title: 'My Root Suite' })).to.have.property(
      'title',
      'My Root Suite'
    );
  });

  it('should throw when json is missing a suite', function() {
    expect(() => {
      mochaJsonDeserialize({});
    }).to.throw(TypeError, 'Unexpected JSON object, missing root suite');
  });

  it('should not throw when json has a suite', function() {
    // eslint-disable-next-line no-unused-expressions
    expect(() => {
      mochaJsonDeserialize({ suite: {} });
      mochaJsonDeserialize({ title: 'My Root Suite' });
    }).to.not.throw;
  });

  describe('~createTest', function() {
    let createTest;
    before(function() {
      // eslint-disable-next-line no-underscore-dangle
      createTest = mochaJsonDeserialize.__get__('createTest');
    });

    it('should throw when failed test is missing an `err` property', function() {
      expect(() => {
        createTest({ title: '', state: STATE_FAILED });
      }).to.throw('A failed test must have an "err" property');
    });

    it('should default pending to false when state is set', function() {
      expect(
        createTest({ title: 'test', state: STATE_PASSED })
      ).to.have.property('pending', false);
    });
  });

  describe('~parseSuite', function() {
    let parseSuite;
    before(function() {
      // eslint-disable-next-line no-underscore-dangle
      parseSuite = mochaJsonDeserialize.__get__('parseSuite');
    });

    it('should override `suite.root` with `isRoot` when `root` is not defined or null', function() {
      expect(parseSuite({ title: '' }, true)).to.have.property('root', true);

      expect(parseSuite({ title: '', root: null }, true)).to.have.property(
        'root',
        true
      );
    });

    it('should not override `suite.root` with `isRoot` when `root` is true', function() {
      expect(
        parseSuite({ title: '', root: true }, true),
        'isRoot=true'
      ).to.have.property('root', true);

      expect(
        parseSuite({ title: '', root: true }, false),
        'isRoot=false'
      ).to.have.property('root', true);
    });
  });
});

describe('back and forth 🐍', function() {
  let origJson;
  let json;

  /**
   *  Remove duration, end, and start from stats since these will always differ for each run
   */
  const statsReplacer = function statsReplacer(key, value) {
    if (key === 'stats') {
      return Object.entries(value)
        .filter(([k]) => !['duration', 'end', 'start'].includes(k))
        .reduce((acc, [k, v]) => {
          acc[k] = v;
          return acc;
        }, {});
    }
    return value;
  };

  [
    { name: 'with stats', stats: true },
    { name: 'without stats', stats: false },
  ].forEach(function(scenario) {
    describe(`${scenario.name}`, function() {
      before(async function() {
        origJson = fs.readFileSync(
          path.resolve(__dirname, './fixtures/mocha-test-fixture.json'),
          'utf-8'
        );

        if (!scenario.stats) {
          // delete stats from json
          const origJsonObj = JSON.parse(origJson);
          delete origJsonObj.stats;
          origJson = JSON.stringify(origJsonObj);
        }

        const rootSuite = mochaJsonDeserialize(origJson);

        json = await runJsonSerializeReporter(rootSuite, {
          stats: scenario.stats,
        });
      });

      it('should match', function() {
        expect(JSON.parse(json, statsReplacer)).to.eql(
          JSON.parse(origJson, statsReplacer)
        );
      });
    });
  });
});
