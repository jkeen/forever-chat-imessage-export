var fs            = require('fs');
var _             = require('lodash');

function addQueryOptions(query, options) {
  if (!options) {
    options = {};
  }
  if (options.sinceDate) {
    query += " AND date >= (strftime('%s', '" + options.sinceDate + "') -978307200) ";
  }

  query += ' ORDER BY date DESC';

  if (options.limit) {
    query = query + " LIMIT " + options.limit;
  }

  return query;
}

module.exports = function getQuery(queryFile, options) {
  if (queryFile) {
    var query = _.trim(fs.readFileSync(('queries/' + queryFile), 'utf8').toString()
      .replace(/(\r\n|\n|\r)/gm," ")
      .replace(/\s+/g, ' '));

    return addQueryOptions(query, options);
  }
  else {
    return false;
  }
};
