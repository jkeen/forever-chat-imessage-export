var Promise       = require('bluebird');
var loadQuery     = require('./load-query');
var openDB        = require('./open-db');
var Converter     = require('./converter');
var debug         = require('./debug');
let rowCount;

module.exports = function fetchResults(db, version, options) {
  var converter = new Converter();

  return new Promise((resolve, reject) => {
    var query = loadQuery("ios9.sql", options);

    db.all('SELECT count(*) as count from message', (error, row) => {
      rowCount = row[0]['count'];
    })

    db.serialize(() => {
      debug(`Preparing ${rowCount} rows…`);
      db.each(query, (error, row) => {
        // get an overall map for relating data
        converter.prepareRow(row);
      }, () => { // FINISHED CALLBACK
        debug('Preparing payload');
        var messages = converter.buildPayload();
        resolve(messages);
      });
    });
  });
};
