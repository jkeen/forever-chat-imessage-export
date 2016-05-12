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
var importData     = importer("test.db");
formatTests(importData);

importData.then(function(d) {
});
