var RSVP          = require('rsvp');
var _             = require('lodash');
var loadQuery     = require('./load-query');
var Converter     = require('./converter');
var openDB        = require('./open-db');
var Crypto         = require('crypto');

class MadridConverter extends Converter {
  constructor(madridAttachmentTableMap) {
    super();

    if (!madridAttachmentTableMap) {
      throw "madrid attachment table map not provided";
    }

    this.madridAttachmentTableMap = madridAttachmentTableMap;
  }

  mapAttachment(id, row) {
    // console.log(row);
    var _this = this;
    if (row._attachment_info && row._attachment_info.length > 0) {
      var marker = row._attachment_info.indexOf("\x01+$");
      var length = row._attachment_info.length;

      var attachmentGuids = row._attachment_info.slice(marker + 3, length - 2);
      // this might be multiple guids separated by weird special characters
      _.each(attachmentGuids.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g), function(guid) {
        // has an attachment
        var attachments = _this.attachmentMap[id];

        // get attachment row from previously fetched results
        var attachmentInfo = _this.madridAttachmentTableMap[guid];

        if (attachments && attachments.length > 0) {
          attachments.push(_this.buildAttachmentRow(row, attachmentInfo));
          _this.attachmentMap[id] = attachments;
        }
        else {
          _this.attachmentMap[id] = [_this.buildAttachmentRow(row, attachmentInfo)];
        }
      });
    }
  }

  buildAttachmentRow(row, attachmentInfo) {
    return {
      "path":  attachmentInfo.filename,
      "type":  attachmentInfo.mime_type
    };
  }
}

/* Fetches madrid_attachment table and keys it by attachment_guid */
function fetchMadridAttachmentsTable(db) {
  var result = {};

  var promise = new RSVP.Promise(function(resolve, reject) {
    db.serialize(() => {
      db.each('SELECT * from madrid_attachment', (error, row) => {
        // get an overall map for relating data
        result[row.attachment_guid] = row;
      }, function() { // FINISHED CALLBACK
        resolve(result);
      });
    });
  });

  return promise;
}

// Madrid was the old codename of iMessages, and the tables are named that in these old databases
function fetchMadridRecords(db, version, options) {
  return new RSVP.Promise((resolve, reject) => {
    return fetchMadridAttachmentsTable(db).then((attachmentsTable) => {

      var converter      = new MadridConverter(attachmentsTable);
      var imessageQuery  = loadQuery("ios5_imessage.sql", options);

      db.serialize(() => {
        db.each(imessageQuery,(error, row) => {
          // get an overall map for relating data
          converter.prepareRow(row);
        }, () => { // FINISHED CALLBACK
          var messages = converter.buildPayload();
          resolve(messages);
        });
      });
    });
  });
}

function fetchSMSRecords(db, version, options) {
  return new RSVP.Promise((resolve, reject) => {
    var converter      = new Converter()
    var smsQuery       = loadQuery("ios5_sms.sql", _.assign(options, {order: ['date DESC', 'attachment_id ASC']}));

    db.serialize(() => {
      db.each(smsQuery,(error, row) => {
        // get an overall map for relating data
        converter.prepareRow(row);
      }, () => { // FINISHED CALLBACK
        var messages = converter.buildPayload();
        resolve(messages);
      });
    });
  });
}

module.exports = function fetchResults(db, version, options) {
  let madridRecords = [];
  let smsRecords    = [];
  return fetchMadridRecords(db, version, options).then(madridRecords => {
    return fetchSMSRecords(db, version, options).then(smsRecords => {
      return [].concat(madridRecords).concat(smsRecords);
    });
  });
};
