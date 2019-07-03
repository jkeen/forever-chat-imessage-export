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
// const OutputStream           = require('./streams/output-stream');

const Promise                = require('bluebird');
const path                   = require("path");

async function importData(filePath, options = {}) {
  options.showProgress = (options.commandLine && options.save);

  if (options.debug || options.commandLine) {
    if (options.debug)      console.log("- debugging on");
    if (options.limit)      console.log(`limited to ${options.limit}`);
    if (options.sinceDate)  console.log(`only getting entries since ${options.sinceDate}`);
    if (options.search)     console.log(`only getting entries containing ${options.search}`);
    if (options.ids)        console.log(`only getting message ids ${options.ids}`);
    if (options.phone)      console.log(`only getting to/from ${options.phone}`);
    if (options.test)       console.log(`only testing entires`);
    if (options.save)       console.log(`writing to ${path.join(__dirname, "data.json").toString()}`);
  }

  var db               = await openDB(filePath);
  var version          = await getDBVersion(db);
  let queries          = await loadQueries(version, options);
  let rowCount         = await getRowCount(db, queries.count);

  let totalCount = (options.limit && rowCount ? Math.min(rowCount, options.limit) : rowCount);

  // These are transform streams
  let readStream          = new ReadDatabaseRowStream(options);
  let fetchAttachments    = new FetchAttachmentsStream(db, queries.attachmentsForId, expandHomeDir(filePath));
  let formatAddresses     = new FormatAddressStream(options);
  let transformIntoFormat = new TransformStream(options);
  let identifyPeople      = new IdentifyStream(options);
  let progressStream      = new ProgressStream(totalCount, options, function signalFinish() {
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

  db.each(queries.messages, (error, row) => {
    readStream.push(row);
  },
  function() {
    // when to end the stream? this is the end of the query
    // stream.end();
  });

  readStream.on('finish', function() {
    // console.log('read done')
  });

  stream.on('error', (error) => {
    console.error(error);
  })

  // stream.on('data', (chunk) => {
  //   if (options.debug) {
  //     // console.log(chunk);
  //   }
  // })

  stream.on('finish', () => {
    // return resolve(stream);
  });

  if (!options.streaming) {
    return new Promise((resolve) => {
      // If we've requested that this not be streaming
      let data = [];
      stream.on('data', (item) => {
        data.push(item);
      });
      stream.on('finish', () => resolve({messages: data}));
    });
  }
  else {
    return stream;
  }
}

module.exports = importData;
