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

  if (options.save) {
    options.writePath = path.join(__dirname, "data.json").toString();
  }
  else {
    options.outputStream = new OutputStream({compact: options.compact});
  }

  options.streaming = true;
  options.commandLine = true;
  await importData(filePath, options);
}

module.exports = commandLine;
