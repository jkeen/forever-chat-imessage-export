var Sqlite3              = require('sqlite3').verbose();
var RSVP                 = require('rsvp');
var _                    = require('lodash');
var fs                   = require('fs');
var expandHomeDir        = require('expand-home-dir');
var loadQuery            = require('./lib/load-query');
var getVersion           = require('./lib/get-version');
var loadFromModernOSX    = require('./lib/load-from-modern-osx');
var loadFromMadridiOS    = require('./lib/load-from-madrid-ios');

function getDbPath(path) {
  var dbPath;
  if (fs.lstatSync(path).isDirectory()) {
    dbPath = path + '/3d0d7e5fb2ce288813306e4d4636395e047a3d28';
  }
  else {
    dbPath = path;
  }

  return dbPath;
}

module.exports =  function(path, options) {
  var dbPath = getDbPath(path);

  if (fs.lstatSync(dbPath).isFile()) {
    return getVersion(dbPath).then(function(version) {
      if (version >= 9) {
        return loadFromModernOSX(dbPath, version, options);
      }
      else if (version === 5) {
        return loadFromMadridiOS(dbPath, version, options);
      }
    });
  }
  else {
    return RSVP.Promise.reject();
    // file not found
  }
};
