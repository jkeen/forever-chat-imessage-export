const openDB                 = require('./utils/open-db');
const getDBVersion           = require('./utils/get-version');
const loadQueries            = require('./utils/load-queries');
const getRowCount            = require('./utils/get-row-count');
const expandHomeDir          = require('expand-home-dir');
const FormatAddressStream    = require('./streams/format-addresses');
const FetchAttachmentsStream = require('./streams/fetch-attachments');
const IdentifyStream         = require('./streams/identify-people');
const TransformStream        = require('./streams/convert-to-format');
const ProgressStream         = require('./streams/progress-stream');
const FileStream             = require('./streams/file-stream');
const ReadDatabaseRowStream  = require('./streams/read-database-row');
const Promise                = require('bluebird');

async function importData(filePath, options) {
  let db               = await openDB(filePath);
  let version          = await getDBVersion(db);
  let queries          = await loadQueries(version, options);
  let rowCount         = await getRowCount(db, queries.count);

  let totalCount = (options.limit && rowCount ? Math.min(rowCount, options.limit) : rowCount);

  let promise = new Promise((resolve) => {
    // These are transform streams
    let readStream          = new ReadDatabaseRowStream(options);
    let fetchAttachments    = new FetchAttachmentsStream(db, queries.attachmentsForId, expandHomeDir(filePath));
    let formatAddresses     = new FormatAddressStream();
    let transformIntoFormat = new TransformStream();
    let identifyPeople      = new IdentifyStream();
    let progressStream      = new ProgressStream(totalCount, {showProgress: options.showProgress}, function onFinishHook() {
      stream.end();
    });

    let stream = readStream
      .pipe(fetchAttachments)
      .pipe(formatAddresses)
      .pipe(transformIntoFormat)
      .pipe(identifyPeople)
      .pipe(progressStream);

    if (options.outputStream) {
      // This is where our output gets specified. File or command line
      stream.pipe(options.outputStream);
    }

    if (options.writePath) {
      let fileStream = new FileStream(options.writePath, totalCount);
      stream.pipe(fileStream);

      fileStream.on('finish', function() {
        stream.end();
      });
    }

    if (!options.streaming) {
      // If we've requested that this not be streaming
      let data = [];
      stream.on('data', function(item) {
        data.push(item);
      });

      stream.on('finish', function() {
        return resolve(data);
      });
    }

    db.each(queries.messages, (error, row) => {
      readStream.push(row);
    },
    function() {
      // when to end the stream? this is the end of the query
      // stream.end();
    });

    readStream.on('finish', function() {
      console.log('read done')
    });
    //
    stream.on('finish', () => {
      console.log('done')
      // return resolve(stream);
    });
  });

  return promise;
}

module.exports = importData;
