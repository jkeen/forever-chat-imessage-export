module.exports = async function commandLine() {
  const program = require("commander");

  let filePath = process.argv[2];
  if (!filePath) {
    console.log("USAGE: forever-chat-imessage-export [path] [options]");
    return;
  } else if (filePath === "system") {
    filePath = "~/Library/Messages/chat.db";
  }

  let options = program
    .version("0.0.1")
    .option("-c, --compact", "print out compactly")
    .option("-d, --debug", "Turn on debugging")
    .option("-l, --limit [value]", "Only return the last X records")
    .option("-i, --ids [value]", "Only return messages with ids")
    .option("-s, --sinceDate [YYYY-MM-DD]", "Only return records since date")
    .option("-f, --search [value]", "Only return records containing text")
    .option("-p, --phone [value]", "Only return records to/from number")
    .option("-t, --test", "Only test the records")
    .option("-w, --save [value]", "write to file")
    .parse(process.argv);

  if (options.debug)      console.log("- debugging on");
  if (options.limit)      console.log(`limited to ${options.limit}`);
  if (options.sinceDate)  console.log(`only getting entries since ${options.sinceDate}`);
  if (options.search)     console.log(`only getting entries containing ${options.search}`);
  if (options.ids)        console.log(`only getting message ids ${options.ids}`);
  if (options.phone)      console.log(`only getting to/from ${options.phone}`);
  if (options.test)       console.log(`only testing entires`);
  if (options.save)       console.log(`writing to ${path.join(__dirname, "data.json").toString()}`);

  options.showProgress = true; // don't do this for when using this not on the command line

  var path            = require("path");
  var prettyoutput    = require("prettyoutput");
  const openDB        = require('./utils/open-db');
  const getDBVersion  = require('./utils/get-version');
  const loadQueries   = require('./utils/load-queries');
  const expandHomeDir = require('expand-home-dir');
  const { Writable }  = require('stream');

  const FormatAddressStream    = require ('./streams/format-addresses');
  const FetchAttachmentsStream = require ('./streams/fetch-attachments');
  const IdentifyStream         = require('./streams/identify-people');
  const TransformStream        = require('./streams/convert-to-format');
  const ProgressStream         = require('./streams/progress-stream');

  class WriteStream extends Writable {
    constructor(options) {
      super(Object.assign({}, options, { objectMode: true }));
      this.options = options;
    }

    _write(object, encoding, callback) {
      let simple = {
        from: object.sender,
        to: object.receiver.join(", "),
        date: object.date,
        text: object.message_text
      };

      if (this.options.compact) {
        callback(null, process.stdout.write(prettyoutput(simple) + "\n\n"));
      }
      else {
        callback(null, process.stdout.write(prettyoutput(object) + "\n\n"));
      }
    }
  }

  let db               = await openDB(filePath);
  let version          = await getDBVersion(db);
  let queries          = await loadQueries(version, options);

  let fetchAttachments = new FetchAttachmentsStream(db, queries.attachmentsForId, expandHomeDir(filePath));
  let formatAddresses  = new FormatAddressStream();
  let transform        = new TransformStream();
  let identify         = new IdentifyStream();
  let progressStream   = new ProgressStream(db, queries.count, options);
  let write            = new WriteStream({compact: options.compact});

  progressStream
    .pipe(fetchAttachments)
    .pipe(formatAddresses)
    .pipe(transform)
    .pipe(identify)
    .pipe(write);

  db.each(queries.messages, (error, row) => fetchAttachments.write(row));
};
