var mocha = require('mocha');
var chai = require('chai');
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var _ = require('lodash');
var importer = require('../index');
var expandHomeDir = require('expand-home-dir');
var Promise = require('bluebird');

chai.use(chaiAsPromised);

var _this = this;
//
describe("basics", function() {
  it('should throw an error when called without a path', function() {
    return importer().then(function() {}, function(reason) {
      expect(reason).to.equal("Couldn't open selected database");
    });
  });

  it('should throw an error when called with a non-sqlite path', function() {
    return importer('test/support/this-is-not-a-sqlite-file.txt').then(function() {}, function(reason) {
      expect(reason).to.equal("Couldn't open selected database");
    });
  });

  it('should only return a set number of records when provided with a limit', function() {
    return importer(expandHomeDir("test/dbs/8010.db"), {
      limit: 5
    }).then(function(data) {
      expect(data.messages.length).to.equal(5);
    });
  });

  it('should only return records after a date when provided with that date', function() {
    return importer(expandHomeDir("test/dbs/8010.db"), {
      sinceDate: "2015-11-16"
    }).then(function(data) {
      var failures = [];
      var successes = [];

      _.each(data.messages, function(datum) {
        if (Date.parse(datum.date) < Date.parse("2015-11-16")) {
          failures.push(datum);
        }
        if (Date.parse(datum.date) >= Date.parse("2015-11-16")) {
          successes.push(datum);
        }

      });

      expect(failures.length).to.equal(0);
      expect(successes.length).to.equal(data.length);
    });
  });
});

var { runTests } = require('forever-chat-format');
let testPaths = [
  ["test/dbs/21.db", "iOS 5"],
  ["test/dbs/36.db", "iOS 6.0"],
  ["test/dbs/6100.db", "iOS 6.1"],
  ["test/dbs/7006.db", "iOS 7"],
  ["test/dbs/8010.db", "iOS 8"],
  ["test/dbs/9005.db", "iOS 9"],
  ["test/dbs/9006_h.db", "iOS 9 (Homer)"]
];

Promise.each(testPaths, (path) => {
  let promise = importer(expandHomeDir(path[0]));
  runTests(promise, path[1]);

  return promise;
});
