var mocha  = require('mocha');
var chai   = require('chai');
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var expect = chai.expect;
var importer = require('../index');
var _ = require('underscore');


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

describe('data formatting', function() {
  var data;

  before(function() {
    this.timeout(5000);
    return importer("/Users/jeff/Library/Messages/chat.db").then(function(d) {
       data = d;
    });
  });

  function findInvalidDates(dates) {
    var badDates = [];
    _.each(dates, function(d) {
      if (d.match(/^\d\d\d\d-\d\d-\d\dT\d\d\:\d\d\:\d\d/).length > 0) {
        // good
      }
      else {
        badDates.push(d);
      }
    });

    return badDates;
  }

  it('should return lots of chats', function() {
    return expect(data.length).to.be.greaterThan(1);
  });

  it('each item has a unique sha', function() {
    this.timeout(5000);

    var shaMap = {};
    var duplicates = [];

    var shas = _.map(data, function(d) {
      var s = JSON.parse(d).sha;
      if (shaMap[s]) {
        duplicates.push(d);
        duplicates.push(shaMap[s]);
      }
      shaMap[s] = d;
      return s;
    });

    var uniques = _.unique(shas);
    expect(shas.length).to.be.equal(data.length, "each message should have a sha");
    expect(duplicates.length).to.be.equal(0, "each sha should be unique " + JSON.stringify(duplicates));
  });

  it('each date is set properly and in ISO-8601 format', function() {
    var dates = _.map(data, function(d) {
      return JSON.parse(d).date;
    });

    expect(dates.length).to.be.equal(data.length);
    expect(findInvalidDates(dates).length).to.be.equal(0);
  });

  it('each date_read is set properly and in ISO-8601 format', function() {
    var dates = _.compact(_.map(data, function(d) {
      return JSON.parse(d).date_read;
    }));

    expect(findInvalidDates(dates).length).to.be.equal(0);
  });

  it('each date_delivered is set properly and in ISO-8601 format', function() {
    var dates = _.compact(_.map(data, function(d) {
      return JSON.parse(d).date_delivered;
    }));

    expect(findInvalidDates(dates).length).to.be.equal(0);
  });

  it('participants always includes sender and receiver', function() {
    return _.each(data, function(d) {
      var message = JSON.parse(d);
      expect(message.participants).to.contain(message.sender);
      _.each(message.receiver, function(r) {
        expect(message.participants).to.contain(r);
      });
    });
  });
});
