var Promise       = require('bluebird');
var loadQuery     = require('./load-query');
var Converter     = require('./converter');
var logger        = require('./debug-log');

module.exports = function fetchResults(db, version, options) {
  var rowCount, converter = new Converter({showProgress: options.showProgress});

  return new Promise((resolve) => {
    let queryFile;
    
    if (version >= 10) {
      queryFile = "ios10.sql";
    }
    else {
      queryFile = "ios9.sql";
    }

    var query = loadQuery(queryFile, options);

    db.serialize(() => {
      db.all('SELECT count(*) as count from message', (error, row) => {
        rowCount = row[0]['count'];
        logger.log(`Preparing ${rowCount} rows…`);
        converter.initializeProgress((options.limit || rowCount));
      });

      db.each(query, (error, row) => {
        // get an overall map for relating data
        converter.prepareRow(row);

        if (options.ids && options.debug) {
          console.log(row);
        }
      }, () => { // FINISHED CALLBACK
        logger.log('Preparing payload');
        var messages = converter.buildPayload();

        resolve(messages);
      });
    });
  });
};
