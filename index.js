#!/usr/bin/env node

(function(){
  var logger               = require('./lib/debug-log');
  var Promise              = require('bluebird');
  var fs                   = require('fs');
  var path                 = require('path');
  var expandHomeDir        = require('expand-home-dir');
  var getVersion           = require('./lib/get-version');
  var loadFromModernOSX    = require('./lib/load-from-modern-osx');
  var loadFromMadridiOS    = require('./lib/load-from-madrid-ios');
  var openDB               = require('./lib/open-db');
  var prettyoutput         = require('prettyoutput');
  var { prepare }          = require('forever-chat-format');
  var bfj                  = require('bfj');

  var exporter = {
    importData: function(filePath, options) {
      if (!options) options = {};
      logger.setEnabled(!!options.debug);

      var promise = new Promise((resolve, reject) => {
        var dbPath = null;

        try {
          if (fs.lstatSync(filePath).isDirectory()) {
            logger.log("Found directory, looking for /3d0d7e5fb2ce288813306e4d4636395e047a3d28");
            dbPath = filePath + '/3d0d7e5fb2ce288813306e4d4636395e047a3d28';
          }
          else if (fs.lstatSync(filePath).isFile()){
            dbPath = filePath;
          }
          else {
            reject("Couldn't open selected database");
          }

          openDB(dbPath).then(db => {
            return getVersion(db).then(function(version) {
              logger.log("Found database version " + version);
              if (version && version > 0) {
                if (version <= 5) {
                  return loadFromMadridiOS(db, version, options);
                }
                else {
                  return loadFromModernOSX(db, version, options);
                }
              }
              else {
                reject("Couldn't open selected database");
              }
            }).then(messages => {
              let results = prepare(messages);
              resolve(results);
            }).finally(() => {
              db.close();
            });

          }, function(/* reason */) {
            reject("Couldn't open selected database");
          });
        }
        catch(e) {
          reject("Couldn't open selected database");
        }
      });

      return promise;
    }
  };

  module.exports = exporter.importData;

  if (!module.parent) {
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
    if (options.phone) console.log(`only getting entires containing ${options.phone}`);
    if (options.test) console.log(`only testing entires`);
    if (options.save) console.log(`writing to ${path.join(__dirname, "data.json").toString()}`);

    options.showProgress = true; // don't do this for when using this not on the command line

    exporter.importData(expandHomeDir(filePath), options).then(data => {
      if (options.save) {
      if (options.test) {
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
})();
