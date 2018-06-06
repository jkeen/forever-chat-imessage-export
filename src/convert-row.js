const Crypto         = require('crypto');
const _              = require('lodash');

const OBJECT_SEPARATOR = "\uFFFC"; // this is the object separator, and imessage uses it as a placeholder for an attachment in a message, in the order the attachments are listed

class ConvertRow {
  constructor(row, attachments) {
    this.row = row;
    this.attachments = attachments;
  }

  // Generates a unique ID to prevent duplicates
  uniqueId(){
    var info = [this.sender(), this.receiver(), this.row.date, this.row.message_text, this.service()];
    return Crypto.createHash('sha1').update(JSON.stringify(info)).digest('hex');
  }

  service() {
    return this.row.service.toLowerCase();
  }

  receiver() {
    if (this.row.is_from_me) {
      return _.without(this.row.participants, this.row.me);
    }
    else {
      return _.without(this.row.participants, this.row.address);
    }
  }

  sender() {
    if (this.row.is_from_me) {
      return this.row.me;
    }
    else {
      return this.row.address;
    }
  }

  buildContentSegments() {
    var segments = [];

    if (this.row.associated_message_guid) {
      // a reaction message doesn't have other parts to it
      segments.push({
        type: 'reaction',
        reaction_type: this.row.reaction_type,
        text: this.row.message_text
      });
    }
    else if (this.row.message_text) {
      var parts = this.row.message_text.split(OBJECT_SEPARATOR);
      _.map(parts, (part, index) => {
        if (part && part.length > 0) {
          //TODO: Split out urls and add them as a link segment

          segments.push({
            type: 'text',
            text: part
          });
        }
        var attachment = this.row.attachments[index];
        if (attachment) {
          segments.push({
            type: 'file',
            path: attachment.path,
            file_type: attachment.type
          });
        }
      });
    }
    else if (this.row.attachments) {
       // not text content, just attachments
      _.each(this.row.attachments, function(attachment) {
        segments.push({
          type: 'file',
          path: attachment.path,
          file_type: attachment.type
        });
      });
    }

    return segments;
  }

  process() {
    return {
      sha:              this.uniqueId(),
      sender:           this.sender(),
      receiver:         this.receiver(),
      is_from_me:       this.row.is_from_me === 0 ? false : true,
      send_error:       null,
      date:             this.row.formatted_date,
      service:          this.service(),
      date_read:        this.row.formatted_date_read,
      date_delivered:   this.row.formatted_date_delivered,
      participants:     this.row.participants,
      message_text:     this.row.message_text,
      message_segments: this.buildContentSegments(),
      attachments:      this.row.attachments,
      _associated_message_guid: this.row.associated_message_guid,
      _msg_id: this.row.msg_id
    };
  }
}

module.exports = ConvertRow;
