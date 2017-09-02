var Promise       = require('bluebird');
var _             = require('lodash');
var loadQuery     = require('./load-query');
var Converter     = require('./converter');
var logger        = require('./debug-log');

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

  var promise = new Promise(function(resolve) {
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
  return new Promise((resolve) => {
    return fetchMadridAttachmentsTable(db).then((attachmentsTable) => {

      var converter      = new MadridConverter(attachmentsTable);
      var imessageQuery  = loadQuery("ios5_imessage.sql", options);

      db.serialize(() => {
        db.all('SELECT count(*) as count from message where is_madrid=1', (error, row) => {
          let rowCount = row[0]['count'];
          logger.log(`Preparing ${rowCount} rows…`);
          converter.initializeProgress(rowCount);
        });

        logger.log('Running madrid query');
        db.each(imessageQuery,(error, row) => {
          // get an overall map for relating data
          converter.prepareRow(row);
        }, () => { // FINISHED CALLBACK
          logger.log('Preparing madrid payload');
          var messages = converter.buildPayload();
          resolve(messages);
        });
      });
    });
  });
}

function fetchSMSRecords(db, version, options) {
  return new Promise((resolve) => {
    var converter      = new Converter({showProgress: options.showProgress});
    var smsQuery       = loadQuery("ios5_sms.sql", _.assign(options, {order: ['date DESC', 'attachment_id ASC'], group: ['message_group', 'participants', 'chat_type']}));
    
    db.serialize(() => {
      db.all('SELECT count(*) as count from message where is_madrid=0', (error, row) => {
        let rowCount = row[0]['count'];
        logger.log(`Preparing ${rowCount} rows…`);
        converter.initializeProgress((options.limit || rowCount));
      });

      logger.log('Running SMS query');
      db.each(smsQuery,(error, row) => {
        // get an overall map for relating data
        converter.prepareRow(row);
      }, () => { // FINISHED CALLBACK
        logger.log('Preparing SMS payload');
        var messages = converter.buildPayload();
        resolve(messages);
      });
    });
  });
}

module.exports = function fetchResults(db, version, options) {
  return fetchMadridRecords(db, version, options).then(madridRecords => {
    return fetchSMSRecords(db, version, options).then(smsRecords => {
      return [].concat(madridRecords).concat(smsRecords);
    });
  });
};
