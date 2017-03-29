var Sqlite3       = require('sqlite3').verbose();
var RSVP          = require('rsvp');

module.exports = function openDB(path) {
  return new RSVP.Promise(function(resolve, reject) {
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
