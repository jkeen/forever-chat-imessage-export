const Sqlite3       = require('sqlite3');
const Promise       = require('bluebird');
const fs            = require('fs');
const logger        = require('./debug-log');
const expandHomeDir = require('expand-home-dir');

async function openDB(filePath) {
  let dbPath;
  return new Promise(function(resolve, reject) {
    if (!filePath) {
      reject("Couldn't open selected database");
    }

    filePath = expandHomeDir(filePath);
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

    return new Sqlite3.Database(dbPath, Sqlite3.OPEN_READONLY, function(err) {
      if (err) {
        reject(`${err} Couldn't open selected database at ${dbPath}`);
      }
      else {
        resolve(this);
      }
    });
  });
}

module.exports = openDB;
