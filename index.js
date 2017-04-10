#!/usr/bin/env node

(function(){
  var logger               = require('./lib/debug-log');
  var Sqlite3              = require('sqlite3').verbose();
  var Promise              = require('bluebird');
  var _                    = require('lodash');
  var fs                   = require('fs');
  var expandHomeDir        = require('expand-home-dir');
  var loadQuery            = require('./lib/load-query');
  var getVersion           = require('./lib/get-version');
  var loadFromModernOSX    = require('./lib/load-from-modern-osx');
  var loadFromMadridiOS    = require('./lib/load-from-madrid-ios');
  var openDB               = require('./lib/open-db');
  var prettyoutput         = require('prettyoutput');

  function fetchVersionSpecificResults(db) {
    return getVersion(db).then(function(version) {
      if (version <= 5) {
        return loadFromMadridiOS(db, version, options);
      }
      else {
        return loadFromModernOSX(db, version, options);
      }
    });
  }

  var exporter = {};
  exporter.importData = function(path, options) {
    logger.setEnabled(!!options.debug);

    var promise = new Promise((resolve, reject) => {
      var dbPath = null;

      try {
        if (fs.lstatSync(path).isDirectory()) {
          logger.log("Found directory, looking for /3d0d7e5fb2ce288813306e4d4636395e047a3d28");
          dbPath = path + '/3d0d7e5fb2ce288813306e4d4636395e047a3d28';
        }
        else if (fs.lstatSync(path).isFile()){
          dbPath = path;
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
              reject("Couldn't open selected database")
            }
          }).then(messages => {

            let results = {
              messages: messages,
            };

            resolve(results);
          }).finally(() => {
            db.close();
          });

        }, function(reason) {
          reject("Couldn't open selected database");
        });
      }
      catch(e) {
        reject("Couldn't open selected database");
      }
    });

    return promise;
  };



  module.exports = exporter.importData;

  if (!module.parent) {
    const program = require('commander');

    let path = process.argv[2];
    if (!path) {
      console.log('USAGE: forever-chat-imessage-export [path] [options]');
      return;
    }

    let options = program
      .version('0.0.1')
      .option('-d, --debug', 'Turn on debugging')
      .option('-l, --limit [value]', 'Only return the last X records')
      .option('-s, --sinceDate [YYYY-MM-DD]', 'Only return records since date')
      .parse(process.argv);

    if (options.debug) console.log('- debugging on');
    if (options.limit) console.log(`limited to ${options.limit}`);
    if (options.sinceDate) console.log(`only getting entries since ${options.sinceDate}`);

    exporter.importData(path, options).then(data => {
      console.log(prettyoutput(data, {maxDepth: 5}));
    });
  }
})();
