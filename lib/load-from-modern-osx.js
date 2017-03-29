var RSVP          = require('rsvp');
var loadQuery     = require('./load-query');
var openDB        = require('./open-db');
var Converter     = require('./converter');

module.exports = function fetchResults(path, version, options) {
  var converter = new Converter();

  return new RSVP.Promise((resolve, reject) => {
    openDB(path).then(db => {
      var query = loadQuery("ios9.sql", options);
      db.serialize(() => {
        db.each(query,(error, row) => {
          // get an overall map for relating data
          converter.prepareRow(row);
        }, () => { // FINISHED CALLBACK
          var messages = converter.buildPayload();
          resolve(messages);
        });
      });
      db.close();
    }, (reason) => reject("Couldn't open selected database"));
  });
};
