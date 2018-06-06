const { prepare }            = require('forever-chat-format');
const openDB                 = require('./utils/open-db');
const getDBVersion           = require('./utils/get-version');
const loadQueries            = require('./utils/load-queries');
const expandHomeDir          = require('expand-home-dir');

const FormatAddressStream    = require ('./streams/format-addresses');
const FetchAttachmentsStream = require ('./streams/fetch-attachments');
const IdentifyStream         = require('./streams/identify-people');
const TransformStream        = require('./streams/convert-to-format');
const ProgressStream         = require('./streams/progress-stream');
const Promise                = require('bluebird');

async function importData (filePath, options) {
  let db               = await openDB(filePath);
  let version          = await getDBVersion(db);
  let queries          = await loadQueries(version, options);

  let promise = new Promise((resolve) => {
    let fetchAttachments = new FetchAttachmentsStream(db, queries.attachmentsForId, expandHomeDir(filePath));
    let formatAddresses  = new FormatAddressStream();
    let transform        = new TransformStream();
    let identify         = new IdentifyStream();
    let progressStream   = new ProgressStream(db, queries.count, options);

    let stream = progressStream
      .pipe(fetchAttachments)
      .pipe(formatAddresses)
      .pipe(transform)
      .pipe(identify);

    if (options.extendStream) {
      stream.pipe(options.extendStream);
    }
      // .pipe(write);

    db.each(queries.messages, (error, row) => progressStream.write(row));

    stream.on('done', () => resolve())
  });

  return promise;
}

module.exports = importData;
