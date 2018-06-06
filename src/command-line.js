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

  var path           = require("path");
  var prettyoutput   = require("prettyoutput");
  var expandHomeDir  = require("expand-home-dir");
  const openDB       = require('./utils/open-db');
  const getDBVersion = require('./utils/get-version');
  const loadQueries  = require('./utils/load-queries');
  const { Readable, Transform, Writable } = require('stream');
  const ConvertRow   = require('./convert-row');
  const normalizePhone = require('phone');

  let db      = await openDB(expandHomeDir(filePath));
  let version = await getDBVersion(db);
  let queries = await loadQueries(version, options);

  class TransformStream extends Transform {
    constructor(options) {
      super(Object.assign({}, options, { objectMode: true }));
    }

    _transform(row, encoding, callback) {
      // EXPECTATIONS:
      // - that row will have attachments already fetched and provided
      // - that row will have attachments
      // - that row's addresses and participants will have been formatted

      let transformed = new ConvertRow(row, row.attachments);

      callback(null, transformed);
    }
  }

  class FetchAttachmentsStream extends Transform {
    constructor(db, queryGeneratorFunc, options) {
      super(Object.assign({}, options, { objectMode: true }));
      this.db = db;
      this.queryGeneratorFunc = queryGeneratorFunc;
    }

    _transform(row, encoding, callback) {
      if (row.attachment_count > 0) {
        let attachmentQuery = this.queryGeneratorFunc(row.msg_id);

        console.log(attachmentQuery);

        this.db.all(attachmentQuery, (error, rows) => {
          row.attachments = rows;
          callback(null, row);
        });
      }
      else {
        row.attachments = [];
        callback(null, row);
      }
    }
  }

  class FormatAddressStream extends Transform {
    constructor(options) {
      super(Object.assign({}, options, { objectMode: true }));
      this.addressCache = {};
    }

    formatAddress(value) {
      let cachedValue = this.addressCache[value];
      let formattedValue;

      if (!cachedValue) {
        if (!value || value === "E:") {
          formattedValue = null;
        }
        else if (value.slice(0,2) === "E:") {
          formattedValue = value.slice(2);
        }
        else {
          var formattedPhone = normalizePhone(value);
          if (formattedPhone && formattedPhone.length > 0) {
            formattedValue = formattedPhone[0];
          }
          else {
            formattedValue = value;
          }
        }
        cachedValue[value] = formattedValue;
      }
      return cachedValue || value;
    }

    _transform(row, encoding, callback) {
      row.address = this.formatAddress(row.address);
      row.participants = row.participants.split('|*--*|').map(participant => this.formatAddress(participant));

      callback(null, row);
    }
  }

  class WriteStream extends Writable {
    constructor(options) {
      super(Object.assign({}, options, { objectMode: true }));
    }

    _write(object, encoding, callback) {
      callback(null, process.stdout.write(prettyoutput(object)));
    }
  }

  var fetch           = new FetchAttachmentsStream(db, queries[0].attachmentsForId);
  var formatAddresses = new FormatAddressStream();
  var transform       = new TransformStream();
  var write           = new WriteStream();

  fetch.pipe(formatAddresses).pipe(transform).pipe(write);

  let messagesQuery = queries[0].messages;

  db.each(messagesQuery, (error, row) => {
    console.log(row);
    fetch.write(row);
  });


};
