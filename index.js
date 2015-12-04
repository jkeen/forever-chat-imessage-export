var Sqlite3 = require('sqlite3').verbose();
var RSVP    = require('rsvp');
var Crypto  = require('crypto');

var QUERY = 'SELECT ' +
'    m.rowid as message_id, ' +
'    (SELECT chat_id FROM chat_message_join WHERE chat_message_join.message_id = m.rowid) as message_group, ' +
' ' +
'    CASE p.participant_count ' +
'        WHEN 0 THEN "???" ' +
'        WHEN 1 THEN "Individual" ' +
'        ELSE "Group" ' +
'    END AS chat_type, ' +
' ' +
'	date, ' +
' ' +
'    strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date +978307200, "unixepoch")) AS formatted_date, ' +
' ' +
'	CASE date_read ' +
'		WHEN 0 THEN null ' +
'		ELSE strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date_read +978307200, "unixepoch"))  ' +
'	END AS formatted_date_read, ' +
'	 ' +
'	CASE date_delivered ' +
'		WHEN 0 THEN null ' +
'		ELSE strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date_delivered +978307200, "unixepoch"))  ' +
'	END AS formatted_date_delivered, ' +
' ' +
'    id AS receiver, ' +
'	last_addressed_handle as sender, ' +
'	is_from_me,  ' +
'    CASE is_from_me ' +
'        WHEN 0 THEN "Received" ' +
'        WHEN 1 THEN "Sent" ' +
'        ELSE is_from_me ' +
'    END AS type, ' +
' ' +
'    text, ' +
'    CASE cache_has_attachments ' +
'        WHEN 0 THEN Null ' +
'        WHEN 1 THEN filename ' +
'    END AS attachment, ' +
'	 ' +
'    m.service ' +
' ' +
'FROM message AS m ' +
'LEFT JOIN message_attachment_join AS maj ON maj.message_id = m.rowid ' +
'LEFT JOIN attachment AS a ON a.rowid = maj.attachment_id ' +
'LEFT JOIN handle AS h ON h.rowid = m.handle_id ' +
'LEFT JOIN chat_message_join as chj ON chj.message_id = m.rowid  ' +
'LEFT JOIN chat as ch ON chj.chat_id = ch.ROWID ' +
'LEFT JOIN (SELECT count(*) as participant_count, cmj.chat_id, cmj.message_id as mid FROM  ' +
'    chat_handle_join as chj ' +
'    INNER JOIN chat_message_join as cmj on cmj.chat_id = chj.chat_id ' +
'    GROUP BY cmj.message_id, cmj.chat_id) as p on p.mid = m.rowid ' +
' ' +
'ORDER BY date DESC LIMIT 100 ';

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
function uniqueId(row){
  var info = [row.address, row.date, row.text, row.service];
  return Crypto.createHash('sha1').update(JSON.stringify(info)).digest('hex');
}

function buildUniversalRow(row) {
  return {
    sha:            uniqueId(row),
    message_group:  row.message_group,
    sender:         row.sender,
    receiver:       row.receiver,
    is_from_me:     row.is_from_me,
    date:           row.formatted_date,
    date_read:      row.formatted_date_read,
    text:           row.text,
    service:        row.service
  };
}

function buildAttachmentRow(row) {
  return {
    "path": row.attachment
  };
}

function rememberOrder(sha) {
  ordered.push(sha);
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

function mapParticipants(id, row) {
  var map = (participantMap[row.message_group] || {});
  map[row.receiver] = "";
  map[row.sender] = "";
  participantMap[row.message_group] = map;
}

function formattedParticipantMapForMessage(message) {
   var p = participantMap[message.message_group];
   delete p[null];
   return Object.keys(p).sort();
}

function formattedAttachmentsForMessage(message) {
  var attachments =  attachmentMap[message.sha];
  return attachments ? attachments : [];
}

function prepareRow(row) {
  var uRow = buildUniversalRow(row);
  var sha  = uRow.sha;

  // this is called in order by date, so we'll remember the
  // order and retreive the keys in the same order
  rememberOrder(sha);

  // For a message with multiple attachments, everything but the attachment
  // will be the same for each row

  // e.g.  id   date      text    attachment
  // e.g.  1   012125125  hello   /path/to/lionel_ritchie_photo_1
  // e.g.  1   012125125  hello   /path/to/lionel_ritchie_photo_2

  // So we'll map the message by sha and eliminate duplicates, and keep
  // track of the attachments by sha, and then relate them together at the end
  mapMessage(sha, uRow);
  mapAttachment(sha, row);
  mapParticipants(sha, row);
}

function buildPayload() {
  var messages = [];
  for (var i = 0; i < ordered.length; i++) {
    var sha = ordered[i];
    var message = messageMap[sha];
    message.attachments  = formattedAttachmentsForMessage(message);
    message.participants = formattedParticipantMapForMessage(message);
    delete message.message_group; // was temporary
    messages.push(JSON.stringify(message));
  }

  return messages;
}

module.exports = function(path, locale) {
  reset();

  var promise = new RSVP.Promise(function(resolve, reject) {
    getConnection(path).then(function(db) {
      db.serialize(function() {
        db.each(QUERY, function(error, row) {
          prepareRow(row);
        }, function() { // FINISHED CALLBACK
          var messages = buildPayload();
          resolve(messages);
        });
      });
      db.close();
    }, function(reason) {
      throw("Couldn't open selected database.");
    });
  });

  return promise;
};
