const { prepare }            = require('forever-chat-format');
const openDB                 = require('./utils/open-db');
const getDBVersion           = require('./utils/get-version');
const loadQueries            = require('./utils/load-queries');
const expandHomeDir          = require('expand-home-dir');

const FormatAddressStream    = require('./streams/format-addresses');
const FetchAttachmentsStream = require('./streams/fetch-attachments');
const IdentifyStream         = require('./streams/identify-people');
const TransformStream        = require('./streams/convert-to-format');
const ProgressStream         = require('./streams/progress-stream');
const Promise                = require('bluebird');

async function getRowCount(db, countQuery) {
  this.rowCount = 0;
  let promise = new Promise((resolve) => {
    db.serialize(() => {
      db.all(countQuery, (error, row) => {
        resolve(row[0]['count']);
      });
    });
  });

  return promise;
}

async function importData (filePath, options) {
  let db               = await openDB(filePath);
  let version          = await getDBVersion(db);
  let queries          = await loadQueries(version, options);
  let rowCount         = await getRowCount(db, queries.count);

  let totalCount = (options.limit && rowCount ? Math.min(rowCount, options.limit) : rowCount);

  let promise = new Promise((resolve) => {
    let fetchAttachments = new FetchAttachmentsStream(db, queries.attachmentsForId, expandHomeDir(filePath));
    let formatAddresses  = new FormatAddressStream();
    let transform        = new TransformStream();
    let identify         = new IdentifyStream();
    let progressStream   = new ProgressStream(totalCount, options);

    let stream = fetchAttachments
      .pipe(formatAddresses)
      .pipe(transform)
      .pipe(identify)
      .pipe(progressStream);

    if (options.extendStream) {
      stream.pipe(options.extendStream);
    }

    db.each(queries.messages, (error, row) => {
      fetchAttachments.write(row);
    },
    function() {
      // when to end the stream? this is the end of the query
      // stream.end();
    });

    stream.on('finish', () => {
      resolve();
    });
  });

  return promise;
}

module.exports = importData;
