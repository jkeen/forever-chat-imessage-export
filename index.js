var Sqlite3              = require('sqlite3').verbose();
var RSVP                 = require('rsvp');
var _                    = require('lodash');
var fs                   = require('fs');
var expandHomeDir        = require('expand-home-dir');
var loadQuery            = require('./lib/load-query');
var getVersion           = require('./lib/get-version');
var loadFromModernOSX    = require('./lib/load-from-modern-osx');
var loadFromMadridiOS    = require('./lib/load-from-madrid-ios');
var openDB               = require('./lib/open-db');

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

module.exports =  function(path, options) {
  var promise = new RSVP.Promise((resolve, reject) => {
    try {
      let dbPath = fs.lstatSync(path);

      if (fs.lstatSync(path).isDirectory()) {
        dbPath = fs.lstatSync(path + '/3d0d7e5fb2ce288813306e4d4636395e047a3d28')
      }
      else if (fs.lstatSync(path).isFile()){
        dbPath = path;
      }
      else {
        reject("Couldn't open selected database");
      }
    }
    catch(e) {
      reject("Couldn't open selected database");
    }

    openDB(path).then(db => {
      return getVersion(db).then(function(version) {
        if (version <= 5) {
          return loadFromMadridiOS(db, version, options);
        }
        else {
          return loadFromModernOSX(db, version, options);
        }
      }).then(results => {
        resolve(results);
        db.close();
      });

    }, function(reason) {
      reject("Couldn't open selected database");
    });
  });

  return promise;
};
