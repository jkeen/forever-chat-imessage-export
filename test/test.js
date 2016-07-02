var mocha          = require('mocha');
var chai           = require('chai');
var chaiAsPromised = require("chai-as-promised");
var expect         = chai.expect;
var _              = require('lodash');
var importer       = require('../index');
var expandHomeDir  = require('expand-home-dir');

chai.use(chaiAsPromised);

var _this = this;
describe("basics", function () {
  it('should throw an error when called without a path', function() {
    var imessageImport = importer();
    return imessageImport.then(function() {
    }, function(reason) {
        expect(reason).to.equal("Couldn't open selected database");
    });
  });

  it('should throw an error when called with a non-sqlite path', function() {
    var imessageImport = importer('test/support/this-is-not-a-sqlite-file.txt');
    return imessageImport.then(function() {
    }, function(reason) {
        expect(reason).to.equal("Couldn't open selected database");
    });
  });
});

var formatTests    = require('forever-chat-format');
var importData     = importer(expandHomeDir("test/chat.db"));

formatTests(importData);

describe("not so basics", function () {
  it('should only return a set number of records when provided with a limit', function() {
    return importer(expandHomeDir("test/chat.db"), {limit: 5}).then(function(data) {
      expect(data.length).to.equal(5);
    });
  });

  it('should only return records after a date when provided with that date', function() {
    return importer(expandHomeDir("test/chat.db"), {sinceDate: "2015-11-16"}).then(function(data) {
      var failures = [];
      var successes = [];

      _.each(data, function(datum) {
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
