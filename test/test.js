var expect   = require('chai').expect;
var importer = require('../index');


describe("basics", function () {
  it('should throw an error when called without a path', function() {

  });

  it('should throw an error when given a non-sqlite database as a path', function() {

  });
});

describe('data formatting', function() {
    var result = false;

    beforeEach(function(done) {
      importer("/Users/jeff/Library/Messages/chat.db").then(function(data) {
        result = data;
        done();
      }, function() {

      });
    });

    it('should work', function() {
      console.log(result)
        expect(result).length.to.be.greaterThan(1);
    });
});
