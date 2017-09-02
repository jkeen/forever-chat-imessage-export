var Crypto         = require('crypto');
var _              = require('lodash');
var normalizePhone = require('phone');
var logger         = require('./debug-log');
var ProgressBar    = require('ts-progress');
var prettyoutput   = require('prettyoutput');

// Expects the results from a query with the results:
/*
m.rowid as msg_id,
NULL as message_group,
CASE NULL
    WHEN 0 THEN "???"
    WHEN 1 THEN "Individual"
    ELSE "Group"
END AS chat_type,
date,
NULL AS address,
NULL as account_login,
NULL AS participants, // single string of numbers, "|*--*|" for group separator
is_from_me,
strftime("%Y-%m-%dT%H:%M:%S", DATETIME(date +978307200, "unixepoch")) AS formatted_date,
NULL as me,
NULL as type,
NULL as text,
NULL AS formatted_date_read,
NULL AS formatted_date_delivered,
NULL AS attachment,
NULL AS attachment_mime_type,
NULL as service
*/

class Converter {
  constructor(options) {
    this.messageMap = {};
    this.guidShaMap = {};
    this.userAddressMap = {};
    this.attachmentMap = {};
    this.participantMap = {};
    this.ordered = [];

    if (options && options.showProgress) {
      this.showProgress = options.showProgress;
    }
  }

  initializeProgress(rowCount) {
    if (!this.showProgress) {
      return;
    }
    this._rowCount = rowCount;
    this.importBar = ProgressBar.create({
      total: this._rowCount,
      pattern: 'Importing: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ', textColor: 'blue',
      updateFrequency: 350
    });

    logger.log(`row count ${rowCount}`);
  }

  updatePrepareProgress() {
    if (!this.showProgress) {
      return;
    }
    this.importBar.update();
  }

  updateExportProgress() {
    if (!this.showProgress) {
      return;
    }
    if (!this.exportBar) {
      this.importBar.done();
      this.exportBar = ProgressBar.create({
        total: this._rowCount,
        pattern: 'Exporting: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ', textColor: 'blue',
        updateFrequency: 350
      });
    }
    this.exportBar.update();
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

  mapMessageGuid(id, row) {
    this.messageGuidIdMap[row.guid] = id;
  }

  mapMessageGuidToSha(guid, sha) {
    this.guidShaMap[guid] = sha;
  }

  mapUserAddresses(row) {
    let me = this.formatAddress(row.me);
    let key = `${me}/${row.service.toLowerCase()}`;
    let formattedDate = new Date(row.formatted_date);

    if (this.userAddressMap[key]) {
      this.userAddressMap[key]["count"] = this.userAddressMap[key]["count"] + 1;

      if (formattedDate < this.userAddressMap[key]['min_date']) {
        this.userAddressMap[key]['min_date'] = formattedDate;
      }
      if (formattedDate > this.userAddressMap[key]['max_date']) {
        this.userAddressMap[key]['max_date'] = formattedDate;
      }
    }
    else {
      this.userAddressMap[key] = {
        address: me,
        service: row.service.toLowerCase(),
        count: 1,
        min_date:  formattedDate,
        max_date:  formattedDate
      };

      if (me && me.match(/^\+?\d+$/)) {
        this.userAddressMap[key]['type'] = 'phone';
      }
      else if (me && me.match(/\@/)) {
        this.userAddressMap[key]['type'] = 'email';
      }
      else {
        this.userAddressMap[key]['type'] = 'other';
      }
    }
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
    map[row.me] = "";
    if (row.participants) {
      _.each(row.participants.split('|*--*|'), (participant) => {
        map[participant] = "";
      });
    }

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

  buildContentSegments(message, row) {
    // this is the object separator. This is a placeholder for an attachment, in the order the attachments are listed
    var segments = [];

    if (row.associated_message_guid) {
      // a reaction message doesn't have other parts to it
      segments.push({
        type: 'reaction',
        reaction_type: row.reaction_type,
        text: message.text
      });
    }
    else if (message.text) {
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
          segments.push({
            type: 'file',
            path: attachment.path,
            file_type: attachment.type
          });
        }
      });
    }
    else if (message.attachments) {
       // not text content, just attachments
      _.each(message.attachments, function(attachment) {
        segments.push({
          type: 'file',
          path: attachment.path,
          file_type: attachment.type
        });
      });
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

    this.mapUserAddresses(row);

    // We'll relate these later
    this.mapAttachment(_id, row);
    this.mapParticipants(row);

    this.updatePrepareProgress(row.msg_id);
  }

  formatAddress(value) {
    if (!value) {
      return value;
    }
    else if (value === "E:") {
      return null;
    }
    else if (value.slice(0,2) === "E:") {
      return value.slice(2);
    }

    var formattedPhone = normalizePhone(value);
    if (formattedPhone && formattedPhone.length > 0) {
      return formattedPhone[0];
    }
    else {
      return value;
    }
  }

  _addressIsBlank(address) {
    return (!address || address === 'E:' || address === 'P:');
  }

  inferMeAddress(message, row) {
    let otherAddresses = [];

    let deliveryService = message.service.toLowerCase();
    let addressType;
    if (row.me === 'P:') {
      addressType = 'phone';
    }
    else if (row.me === 'E:') {
      addressType = 'email';
    }

    if (deliveryService === 'sms') {
      addressType = 'phone'; // I think this is a safe bet. SMS messages come from phone numbers, not emails
    }

    otherAddresses = _.filter(_.values(this.userAddressMap), (info) => {
      return (info.type === addressType || !addressType) && info.service === deliveryService;
    });

    if (otherAddresses.length === 1 && !!otherAddresses[0].address) { // nailed it
      return otherAddresses[0].address;
    }
    else {
      if (otherAddresses.length > 1) {
        logger.log(prettyoutput(`Multiple possible addresses matched when looking for type: row.me = ${row.me} & row.service = ${message.service} & row.date = ${message.date}`));
        logger.log(prettyoutput(otherAddresses));

        let sentDate = new Date(message.date);

        // Check to see if the message in question's date falls between
        // the first known usage of address and last known usage of address
        let filteredAddresses = _.filter(otherAddresses, (info) => {
          return (sentDate >= new Date(info.min_date) && sentDate <= new Date(info.max_date));
        });

        if (filteredAddresses.length === 1) {
          // it fell between those, and not between the others
          return filteredAddresses[0].address;
        }
        else if (filteredAddresses.lenght > 1) {
          // there were multiple matches, so pick the one that's most common.
          // TODO: maybe put a warning in here

          filteredAddresses = _.sortBy(filteredAddresses, (i => i.count));
          return filteredAddresses[0].address;
        }
        else {
          _.sortBy(otherAddresses, (i => i.count))[0].address;
        }

      }
      else {
        logger.log(this.userAddressMap);
        logger.log(prettyoutput(`No possible addresses matched when looking for type: ${addressType} from ${deliveryService} in ${row}`));
        // None found
      }
    }
  }

  buildPayload() {
    var _this = this;
    var messages = [];
    var toAssociate = [];
    let ordered  = _.cloneDeep(this.ordered);
    let messageMap = _.cloneDeep(this.messageMap);
    for (var i = ordered.length; i >= 0; i--) {
      var _id = ordered[i];
      var row = messageMap[_id];
      var inferredMeAddress;
      if (row) {
        var debugInfo = {
          _id: _id,
          message_id: row.msg_id,
          message_group: row.message_group,
          message_type:   row.chat_type,
          me: row.me,
          address: row.address,
          participants: row.participants,
          associated_message_guid: row.associated_message_guid
        };

        _this.updateExportProgress(row.msg_id);

        // we don't want no dupes
        var message = {
          is_from_me:     row.is_from_me,
          text:           row.text,
          date:           row.formatted_date,
          date_read:      row.formatted_date_read,
          service:        row.service.toLowerCase()
        };

        if (this._addressIsBlank(row.me)) {
          inferredMeAddress        = this.inferMeAddress(message, row);
          if (inferredMeAddress) {
            debugInfo['inferredMe'] = true;
          }
        }

        let me                   = this.formatAddress(inferredMeAddress ? inferredMeAddress : row.me);
        let address              = this.formatAddress(row.address);
        message.participants     = this.lookupParticipants(row.message_group);
        message.participants     = _.compact(_.uniq(_.map(message.participants, (p) => {
          let address = this.formatAddress(p);
          if (address === '<me>' && !!inferredMeAddress) {
            return inferredMeAddress;
          }
          else {
            return address;
          }
        })));

        if (message.participants.length === 1) {
          // sending a message to yourself? Alright, I guess. It happens.
          message.sender = me;
          message.receiver = message.participants;
        }
        else if (message.is_from_me) {
          message.sender = me;
          message.receiver = _.without(message.participants, message.me);
        }
        else {
          message.sender = address;
          message.receiver = _.without(message.participants, row.address);
        }

        if (!_.includes(message.participants, message.sender)) {
          message.participants.push(message.sender);
        }
        else if (!_.includes(message.participants, message.sender)) {
          message.participants.push(message.receiver);
        }

        message.attachments      = this.lookupAttachments(_id);
        message.message_segments = this.buildContentSegments(message, row);

        message._debug = debugInfo;

        delete messageMap[_id];

        // Uniquely idenfify this one message for outside use
        message.sha = this.uniqueId(message);

        this.mapMessageGuidToSha(row.guid, message.sha);

        if (row.associated_message_guid) {

          let guid = row.associated_message_guid.split(":").pop().split("/").pop();


          let associatedSha = undefined;
          if (message.sha !== this.guidShaMap[guid]) {
            associatedSha = this.guidShaMap[guid];
          }
          // console.log(`guid = ${row.guid}`);
          // console.log(`lookup by row.guid = ${this.guidShaMap[row.guid]}`);
          // console.log(`lookup by guid = ${this.guidShaMap[guid]}`);
          // console.log('----------------------------');
          message.associated_sha = associatedSha;
        }

        messages.push(message);
      }
    }

    return messages;
  }
}

module.exports = Converter;
