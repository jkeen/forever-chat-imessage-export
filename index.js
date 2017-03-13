var Sqlite3       = require('sqlite3').verbose();
var RSVP          = require('rsvp');
var Crypto        = require('crypto');
var _             = require('lodash');
var fs            = require('fs');
var os            = require('os');
var plist         = require('plist');
var expandHomeDir = require('expand-home-dir');
var darwinToOSNames = {
  "12": "Mountain Lion",
  "13": "Mavericks",
  "14": "Yosemite",
  "15": "El Capitan",
  "16": "Sierra"
};

var GROUP_SEPARATOR = '|*--*|';

function getConnection(path) {
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

var messageMap = {};
var attachmentMap = {};
var ordered = [];
var participantMap = {};

// Resets the maps so on subsequent calls we don't get overlaps
function reset() {
  messageMap = {};
  attachmentMap = {};
  participantMap = {};
  ordered = [];
}

// Generates a unique ID to prevent duplicates
function uniqueId(message){
  var info = [message.participants, message.date, message.text, message.service];
  return Crypto.createHash('sha1').update(JSON.stringify(info)).digest('hex');
}

function internalIdentifier(row) {
  // This is used to identify a unique before outputting. This should not be
  // the sha used to uniquely identify the chat message—that should use
  // 'participants', which we generate

  var info = [row.address, row.date, row.text, row.service];
  return Crypto.createHash('sha1').update(JSON.stringify(info)).digest('hex');
}

function buildAttachmentRow(row) {
  return {
    "path":  row.attachment,
    "type":  row.mime_type
  };
}

function rememberOrder(id) {
  ordered.push(id);
}

function mapMessage(id, row) {
  messageMap[id] = row;
}

function mapAttachment(id, row) {
  if (row.attachment && row.attachment.length > 0) {
    // has an attachment
    var attachments = attachmentMap[id];

    if (attachments && attachments.length > 0) {
      attachments.push(buildAttachmentRow(row));
      attachmentMap[id] = attachments;
    }
    else {
      attachmentMap[id] = [buildAttachmentRow(row)];
    }
  }
}

function mapParticipants(row) {
  // We don't want to map this to id/sha, we want the message group.
  var map = (participantMap[row.message_group] || {});
  // Using a hash so we can only deal in uniques
  map[row.address] = "";
  map[row.me || '<me>'] = "";
  participantMap[row.message_group] = map;
}

function lookupParticipants(message_group) {
   var p = participantMap[message_group];
   delete p[null];
   return Object.keys(p).sort();
}

function lookupAttachments(sha) {
  var attachments =  attachmentMap[sha];
  return attachments ? attachments : [];
}

function buildContentSegments(message) {
  // this is the object separator. This is a placeholder for an attachment, in the order the attachments are listed
  var segments = [];

  if (message.text) {
    var parts = message.text.split("\uFFFC");
    _.map(parts, function(part, index) {
      if (part && part.length > 0) {
        //TODO: Split out urls and add them as a link segment

        segments.push({
          type: 'text',
          text: part
        });
      }
      var attachment = message.attachments[index];
      if (attachment) {
        segments.push(attachment);
      }
    });
  }
  else if (message.attachments) {
    segments = message.attachments;
  }

  return segments;
}

function setSenderAndReceiver(message) {
  if (message.is_from_me) {
    message.sender   = message._me;
    message.receiver = _.without(message.participants, message._me);
  }
  else {
    message.sender = message._address;
    message.receiver = _.without(message.participants, message._address);
  }
  // delete message._address;
  // delete message._me;

  return message;
}

function prepareRow(row) {
  var _id  = internalIdentifier(row);

  // this is called in order by date, so we'll remember the
  // order and retreive the keys in the same order
  rememberOrder(_id);

  // For a message with multiple attachments, everything but the attachment
  // will be the same for each row

  // e.g.  id   date      text    attachment
  // e.g.  1   012125125  hello   /path/to/lionel_ritchie_photo_1
  // e.g.  1   012125125  hello   /path/to/lionel_ritchie_photo_2

  // So we'll map the message by _id and eliminate duplicates, and keep
  // track of the attachments by _id, and then relate them together at the end
  mapMessage(_id, row);

  // We'll relate these later
  mapAttachment(_id, row);
  mapParticipants(row);
}

function buildPayload() {
  var messages = [];
  for (var i = 0; i < ordered.length; i++) {
    var _id = ordered[i];
    var row = messageMap[_id];

    if (row) {
      // we don't want no dupes
      var message = {
        is_from_me:     row.is_from_me,
        text:           row.text,
        date:           row.formatted_date,
        date_read:      row.formatted_date_read,
        service:        row.service
      };

      message.attachments      = lookupAttachments(_id);
      message.participants     = lookupParticipants(row.message_group);

      if (message.is_from_me) {
        message.sender   = row.me;
        message.receiver = _.without(message.participants, row.me);
      }
      else {
        message.sender = row.address;
        message.receiver = _.without(message.participants, row.address);
      }

      message.message_segments = buildContentSegments(message);

      message._debug = {
        _id: _id,
        message_id: message.message_id,
        message_group: message.message_group
      };

      delete messageMap[_id];
      // Uniquely idenfify this one message for outside use
      message.sha = uniqueId(message);
      messages.push(message);
    }
  }

  return messages;
}

function getClientVersion(path) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    getConnection(path).then(function(db) {
      db.serialize(function() {
        var clientVersion;
        db.each("SELECT value from _SqliteDatabaseProperties WHERE key = '_ClientVersion'", function(error, row) {
          clientVersion = row.value;
        }, function() { // FINISHED CALLBACK
          resolve(clientVersion);
        });
      });
      db.close();
    }, function(reason) {
      console.log("couldn't open database");
      console.log(reason);
      reject("Couldn't open selected database");
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
// 11    - iOS4       - iPhone 3G, 2010
function getQueryForClientVersion(version) {
  version = parseInt(version);
  var queryFile;
  if (version >= 10000) {
    console.log('found iOS 10 database');
    queryFile = 'ios9.sql';
  }
  else if (version >= 9000) {
    console.log('found iOS 9 database');
    queryFile = 'ios9.sql';
  }
  else {
    console.log('Not sure how to work with database version: ' + version);
  }
  // else if (version >= 8000) {
  //   console.log('found iOS 8 database');
  //   // queryFile = "ios8.sql";
  // }
  // else if (version >= 7000) {
  //   console.log('found iOS 7 database');
  //
  // }
  // else if (version >= 36) {
  //   console.log('found iOS 6 database');
  //
  // }
  // else if (version >= 21) {
  //   console.log('found iOS 5 database');
  //
  // }
  // else if (version >= 11) {
  //   console.log('found iOS 4 database');
  //
  // }


  if (queryFile) {
    var query = _.trim(fs.readFileSync(('queries/' + queryFile), 'utf8').toString()
      .replace(/(\r\n|\n|\r)/gm," ")
      .replace(/\s+/g, ' ')) + ';';

    return query;
  }
  else {
    return false;
  }
}

function addQueryOptions(query, options) {
  if (!options) {
    options = {};
  }
  if (options.sinceDate) {
    query += " AND date >= (strftime('%s', '" + options.sinceDate + "') -978307200) ";
  }

  query += 'ORDER BY date DESC';

  if (options.limit) {
    query = query + " LIMIT " + options.limit;
  }

  return query;
}

function fetchResults(path, query) {
  var promise = new RSVP.Promise(function(resolve, reject) {
    getConnection(path).then(function(db) {
      db.serialize(function() {
        db.each(query, function(error, row) {
          // get an overall map for relating data
          prepareRow(row);
        }, function() { // FINISHED CALLBACK
          var messages = buildPayload();
          resolve(messages);
        });
      });
      db.close();
    }, function(reason) {
      console.log("couldn't open database");
      console.log(reason);
      reject("Couldn't open selected database");
    });
  });

  return promise;
}

module.exports =  function(path, options) {
  reset();
  var dbPath;
  if (fs.lstatSync(path).isDirectory()) {
    dbPath = path + '/3d0d7e5fb2ce288813306e4d4636395e047a3d28';
  }
  else {
    dbPath = path;
  }

  if (fs.lstatSync(dbPath).isFile()) {
    return getClientVersion(dbPath).then(function(versionString) {
      reset();
      var query         = getQueryForClientVersion(versionString);
      query             = addQueryOptions(query, options);
      console.log("Looking for info at path: " + dbPath);
      return fetchResults(dbPath, query);
    });
  }
  else {
    return RSVP.Promise.reject();
    // file not found
  }
}
