var Promise       = require('bluebird');
var loadQuery     = require('./load-query');
var openDB        = require('./open-db');
var Converter     = require('./converter');
var logger        = require('./debug-log');

module.exports = function fetchResults(db, version, options) {
  var rowCount, converter = new Converter();

  return new Promise((resolve, reject) => {
    var query = loadQuery("ios9.sql", options);

    db.serialize(() => {
      db.all('SELECT count(*) as count from message', (error, row) => {
        rowCount = row[0]['count'];
        logger.log(`Preparing ${rowCount} rows…`);
        converter.initializeProgress(rowCount);
      })

      db.each(query, (error, row) => {

        // get an overall map for relating data
        converter.prepareRow(row);
      }, () => { // FINISHED CALLBACK
        logger.log('Preparing payload');
        var messages = converter.buildPayload();


        resolve(messages);
      });
    });
  });
};
