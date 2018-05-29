var path = require('path');
var prettyoutput = require('prettyoutput');
var expandHomeDir = require('expand-home-dir');
var bfj = require('bfj');

import importData from 'import';

export default function commandLine() {
  const program = require('commander');

  let filePath = process.argv[2];
  if (!filePath) {
    console.log('USAGE: forever-chat-imessage-export [path] [options]');
    return;
  }
  else if (filePath === 'system') {
    filePath = "~/Library/Messages/chat.db";
  }

  let options = program
    .version('0.0.1')
    .option('-d, --debug', 'Turn on debugging')
    .option('-l, --limit [value]', 'Only return the last X records')
    .option('-i, --ids [value]', 'Only return messages with ids')
    .option('-s, --sinceDate [YYYY-MM-DD]', 'Only return records since date')
    .option('-f, --search [value]', 'Only return records containing text')
    .option('-p, --phone [value]', 'Only return records to/from number')
    .option('-t, --test', 'Only test the records')
    .option('-w, --save [value]', 'write to file')
    .parse(process.argv);

  if (options.debug) console.log('- debugging on');
  if (options.limit) console.log(`limited to ${options.limit}`);
  if (options.sinceDate) console.log(`only getting entries since ${options.sinceDate}`);
  if (options.search) console.log(`only getting entries containing ${options.search}`);
  if (options.ids) console.log(`only getting message ids ${options.ids}`);
  if (options.phone) console.log(`only getting to/from ${options.phone}`);
  if (options.test) console.log(`only testing entires`);
  if (options.save) console.log(`writing to ${path.join(__dirname, "data.json").toString()}`);

  options.showProgress = true; // don't do this for when using this not on the command line

  importData(expandHomeDir(filePath), options).then(data => {
    if (options.test) {
      console.log(prettyoutput(data.validations, {maxDepth: 7}));
      if (options.save) {
        bfj.write(`${path.join(__dirname, "validations.json").toString()}`, data.validations, {space: 4})
          .then(() => {
            console.log('donnnne');
          })
          .catch((e) => {
            console.log(e);
          });
      }
    }
    else if (options.save) {
      let filePath = path.join(__dirname, "data.json").toString();
      bfj.write(filePath, data, {space: 4})
        .then(() => {
          console.log('donnnne');
        })
        .catch((e) => {
          console.log(e);
        });
    }
    else {
      console.log(prettyoutput(data, {maxDepth: 7}));
    }
  });
}
