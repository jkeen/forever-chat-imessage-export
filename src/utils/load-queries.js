const fs     = require('fs');
const path   = require('path');
const _      = require('lodash');
const logger = require('./debug-log');

function loadQuery(filePath) {
  return _.trim(fs.readFileSync(path.join(__dirname, filePath), 'utf8').toString()
    .replace(/(\r\n|\n|\r)/gm," ")
    .replace(/\s+/g, ' '));
}

function addAttachmentQueryOptions(query, options) {
  if (!options) {
    options = {};
  }

  let additions = "";

  if (options.ids) {
    additions += ` WHERE msg_id IN (${options.ids})`;
  }

  logger.log(`query options: ${additions}`);
  logger.log(`query: ${query + additions}`);

  return query + additions + " ORDER BY message_attachments.ROWID";
}

function addQueryOrdering(query, options = {}) {
  options = _.assign({order: ['date DESC']}, options);

  let additions = "";

  additions += ' ORDER BY ' + options.order.join(", ");

  if (options.limit) {
    additions = additions + " LIMIT " + options.limit;
  }

  return query + additions;
}

function addQueryConditions(query, options = {}) {
  let additions = "";

  if (options.sinceDate) {
    additions += " AND date >= (strftime('%s', '" + options.sinceDate + "') -978307200) ";
  }

  if (options.search) {
    additions += ` AND message_text LIKE "%${options.search}%"`;
  }

  if (options.phone) {
    additions += ` AND (participants LIKE "%${options.phone}%" OR address LIKE "%${options.phone}%")`;
  }

  if (options.ids) {
    additions += ` AND msg_id IN (${options.ids})`;
  }

  if (options.group) {
    additions = additions + " GROUP BY " + options.group;
  }

  logger.log(`query options: ${additions}`);
  logger.log(`query: ${query + additions}`);

  return query + additions;
}

module.exports = function(version, options) {
  let querySet;

  if (version <= 5) {
    let smsQuery      = addQueryConditions(loadQuery("../queries/v5/sms/messages.sql"), options);
    let messagesQuery = addQueryConditions(loadQuery("../queries/v5/imessage/messages.sql"), options);
    let unionedQuery  = addQueryOrdering(`${messagesQuery} UNION ${smsQuery}`, options);

    querySet = {
      messages: unionedQuery,
      attachments: loadQuery("../queries/v5/attachments.sql")
    };
  }
  else if (version >= 10) {
    querySet = {
      messages: addQueryOrdering(addQueryConditions(loadQuery("../queries/v10/messages.sql"), options), options),
      attachments: loadQuery("../queries/v10/attachments.sql")
    };
  }
  else {
    querySet = {
      messages: addQueryOrdering(addQueryConditions(loadQuery("../queries/v9/messages.sql"), options), options),
      attachments: loadQuery("../queries/v9/attachments.sql")
    };
  }

  querySet.count = "SELECT count(*) as count FROM message ";

  querySet.attachmentsForId = (id) => {
    return addAttachmentQueryOptions(querySet.attachments, {ids: [id]}, version);
  };

  return querySet;
};
