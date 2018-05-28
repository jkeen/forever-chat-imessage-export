import openDB from 'utils/open-db';
// import loadQuery from 'utils/load-query';
import { prepare } from 'forever-chat-format';
import logger from 'utils/debug-log';
import getVersion from 'utils/get-version';
var fs  = require('fs');

function importData (filePath, options) {
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
              // return loadFromMadridiOS(db, version, options);
            }
            else {
              // return loadFromModernOSX(db, version, options);
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

export default importData;
