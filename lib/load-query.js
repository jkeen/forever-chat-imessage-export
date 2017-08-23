(function() {
  var fs            = require('fs');
  var path          = require('path');
  var _             = require('lodash');
  var logger        = require('./debug-log');

  // This is ghetto, I admit
  function addQueryOptions(query, options) {
    if (!options) {
      options = {};
    }

    options = _.assign({order: ['date DESC']}, options);

    let additions = "";

    if (options.sinceDate) {
      additions += " AND date >= (strftime('%s', '" + options.sinceDate + "') -978307200) ";
    }

    if (options.search) {
      additions += ` AND text LIKE "%${options.search}%"`;
    }

    if (options.phone) {
      additions += ` AND (participants LIKE "%${options.phone}%" OR address LIKE "%${options.phone}%")`;
    }

    if (options.ids) {
      additions += ` AND (m.rowid IN (${options.ids}))`;
    }

    additions += ' ORDER BY ' + options.order.join(", ");

    if (options.limit) {
      additions = additions + " LIMIT " + options.limit;
    }



    logger.log(`query options: ${additions}`);
    logger.log(`query: ${query + additions}`);

    return query + additions;
  }

  function getQuery(queryFile, options) {
    if (queryFile) {
      logger.log('loading query file: ' + queryFile);

      var query = _.trim(fs.readFileSync(path.join(__dirname, ('../queries/' + queryFile)), 'utf8').toString()
        .replace(/(\r\n|\n|\r)/gm," ")
        .replace(/\s+/g, ' '));

      return addQueryOptions(query, options);
    }
    else {
      return false;
    }
  }

  module.exports = getQuery;
})();
