import Promise from "bluebird";

function getClientVersion(db) {
  var promise = new Promise(function(resolve) {
    db.serialize(function() {
      var clientVersion;
      db.each("SELECT value from _SqliteDatabaseProperties WHERE key = '_ClientVersion'", function(error, row) {
        clientVersion = row.value;
      }, function() { // FINISHED CALLBACK
        resolve(clientVersion);
      });
    });
  });

  return promise;
}

// I know about these client versions
// 10013 - iOS 10     - 2017
// 9005  - iOS 9      - 2015
// 8008  - iOS 8      - 2014
// 7006  - iOS 7      - 2013
// 6100  - iOS 6.1.2  - 2014
// 36    - iOS 6      - 2012
// 21    - iOS 5      - 2011
// 11    - iOS 4      - iPhone 3G, 2010

function getOSVersionForClientVersion(version) {
  version = String(version);

  if (version.length === 5) {
    return parseFloat(version.slice(0,2) + '.' + version.slice(2,3));
  }
  else if (version.length === 4) {
    return parseFloat(version.slice(0,1) + '.' + version.slice(1,2));
  }
  else {
    var intVersion = parseInt(version);
    if (intVersion >= 36) {
      return 6;
    }
    else if (intVersion >= 21) {
      return 5;
    }
    else if (intVersion >= 11) {
      return 4;
    }
  }

  return -1;
}

export default function(db) {
  return getClientVersion(db).then(function(clientVersionString) {
    var version = getOSVersionForClientVersion(clientVersionString);
    return version;
  });
}
