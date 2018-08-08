const program      = require("commander");
const path         = require("path");
const OutputStream = require('./streams/output-stream');
const importData   = require('./import');

async function commandLine() {
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

  if (options.save) {
    options.writePath = path.join(__dirname, "data.json").toString();
  }
  else {
    options.outputStream = new OutputStream({compact: options.compact});
  }

  await importData(filePath, options);
}

module.exports = commandLine;
