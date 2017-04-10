var fs            = require('fs');
var _             = require('lodash');
var debug         = require('./debug');

// This is ghetto, I admit
function addQueryOptions(query, options) {
  if (!options) {
    options = {};
  }

  options = _.assign({order: ['date DESC']}, options);

  if (options.sinceDate) {
    query += " AND date >= (strftime('%s', '" + options.sinceDate + "') -978307200) ";
  }

  query += ' ORDER BY ' + options.order.join(", ");

  if (options.limit) {
    query = query + " LIMIT " + options.limit;
  }

  return query;
}

module.exports = function getQuery(queryFile, options) {
  if (queryFile) {
    debug('loading query file: ' + queryFile);
    var query = _.trim(fs.readFileSync(('queries/' + queryFile), 'utf8').toString()
      .replace(/(\r\n|\n|\r)/gm," ")
      .replace(/\s+/g, ' '));

    return addQueryOptions(query, options);
  }
  else {
    return false;
  }
};
