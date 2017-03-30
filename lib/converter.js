var Crypto        = require('crypto');
var _             = require('lodash');

class Converter {
  constructor() {
    this.messageMap = {};
    this.attachmentMap = {};
    this.participantMap = {};
    this.ordered = [];
  }

  // Generates a unique ID to prevent duplicates
  uniqueId(message){
    var info = [message.sender, message.receiver, message.date, message.text, message.service];
    return Crypto.createHash('sha1').update(JSON.stringify(info)).digest('hex');
  }

  internalIdentifier(row) {
    // This is used to identify a unique before outputting. This should not be
    // the sha used to uniquely identify the chat message—that should use
    // 'participants', which we generate

    var info = [row.address, row.date, row.text, row.service];
    return Crypto.createHash('sha1').update(JSON.stringify(info)).digest('hex');
  }

  buildAttachmentRow(row) {
    return {
      "path":  row.attachment,
      "type":  row.attachment_mime_type
    };
  }

  rememberOrder(id) {
    this.ordered.push(id);
  }

  mapMessage(id, row) {
    this.messageMap[id] = row;
  }

  mapAttachment(id, row) {
    if (row.attachment && row.attachment.length > 0) {
      // has an attachment
      var attachments = this.attachmentMap[id];

      if (attachments && attachments.length > 0) {
        attachments.push(this.buildAttachmentRow(row));
        this.attachmentMap[id] = attachments;
      }
      else {
        this.attachmentMap[id] = [this.buildAttachmentRow(row)];
      }
    }
  }

  mapParticipants(row) {
    // We don't want to map this to id/sha, we want the message group.
    var map = (this.participantMap[row.message_group] || {});
    // Using a hash so we can only deal in uniques
    map[row.address] = "";
    map[row.me || '<me>'] = "";
    this.participantMap[row.message_group] = map;
  }

  lookupParticipants(message_group) {
     var p = this.participantMap[message_group];
     delete p[null];
     return Object.keys(p).sort();
  }

  lookupAttachments(sha) {
    var attachments =  this.attachmentMap[sha];
    return attachments ? attachments : [];
  }

  buildContentSegments(message) {
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

  setSenderAndReceiver(message) {
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

  prepareRow(row) {
    var _id  = this.internalIdentifier(row);

    // this is called in order by date, so we'll remember the
    // order and retreive the keys in the same order
    this.rememberOrder(_id);

    // For a message with multiple attachments, everything but the attachment
    // will be the same for each row

    // e.g.  id   date      text    attachment
    // e.g.  1   012125125  hello   /path/to/lionel_ritchie_photo_1
    // e.g.  1   012125125  hello   /path/to/lionel_ritchie_photo_2

    // So we'll map the message by _id and eliminate duplicates, and keep
    // track of the attachments by _id, and then relate them together at the end
    this.mapMessage(_id, row);

    // We'll relate these later
    this.mapAttachment(_id, row);
    this.mapParticipants(row);
  }

  buildPayload() {
    var messages = [];
    let ordered  = _.cloneDeep(this.ordered);
    let messageMap = _.cloneDeep(this.messageMap);
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

        message.attachments      = this.lookupAttachments(_id);
        message.participants     = this.lookupParticipants(row.message_group);


        if (message.participants.length === 1) {
          // sending a message to yourself?
          message.sender = row.me;
          message.receiver = message.participants;
        }
        else if (message.is_from_me) {
          message.sender = row.me;
          message.receiver = _.without(message.participants, row.me);
        }
        else {
          message.sender = row.address;
          message.receiver = _.without(message.participants, row.address);
        }

        message.message_segments = this.buildContentSegments(message);

        message._debug = {
          _id: _id,
          message_id: row.message_id,
          message_group: row.message_group
        };

        delete messageMap[_id];
        // Uniquely idenfify this one message for outside use
        message.sha = this.uniqueId(message);
        messages.push(message);
      }
    }

    return messages;
  }
}

module.exports = Converter;
