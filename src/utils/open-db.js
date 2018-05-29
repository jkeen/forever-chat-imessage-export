var Sqlite3 = require('sqlite3');
var Promise = require('bluebird');

export default function openDB(path) {
  return new Promise(function(resolve, reject) {
    return new Sqlite3.Database(path, Sqlite3.OPEN_READONLY, function(err) {
      if (err) {
        reject(this);
      }
      else {
        resolve(this);
      }
    });
  });
}
