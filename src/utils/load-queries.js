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

  return query + additions + " ORDER BY maj.ROWID";
}

function addMessageQueryOptions(query, options) {
  if (!options) {
    options = {};
  }

  options = _.assign({order: ['date DESC']}, options);

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

  additions += ' ORDER BY ' + options.order.join(", ");

  if (options.limit) {
    additions = additions + " LIMIT " + options.limit;
  }

  logger.log(`query options: ${additions}`);
  logger.log(`query: ${query + additions}`);

  return query + additions;
}

module.exports = function(version, options) {
  let querySet;

  if (version <= 5) {
    querySet = [
      {
        messages: "../queries/v5/imessage/messages.sql",
        attachments: "../queries/v5/imessage/attachments.sql"
      },
      {
        messages: "../queries/v5/sms/messages.sql",
        attachments: "../queries/v5/sms/attachments.sql"
      }
    ];
  }
  else if (version >= 10) {
    querySet = [
      {
        messages: "../queries/v10/messages.sql",
        attachments: "../queries/v10/attachments.sql"
      },
    ];
  }
  else {
    querySet = [
      {
        messages: "../queries/v9/messages.sql",
        attachments: "../queries/v9/attachments.sql"
      },
    ];
  }

  return querySet.map(query => {
    let result = {
      messages:    addMessageQueryOptions(loadQuery(query.messages), options),
      attachments: loadQuery(query.attachments)
    };

    result.attachmentsForId = (id) => {
      return addAttachmentQueryOptions(result.attachments, {ids: [id]});
    };

    return result;
  });
};
