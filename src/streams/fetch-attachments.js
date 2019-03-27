const { Transform } = require('stream');
const Promise = require('bluebird');
const path    = require('path');
// Takes a row, and looks up its attachments if it has any
// Adds an .attachments property on the row with the array of attachments and returns it

class FetchAttachmentsStream extends Transform {
  constructor(db, queryGeneratorFunc, dbPath, options = {}) {
    super(Object.assign({}, options, { objectMode: true }));
    this.debug = options.debug;
    this.db = db;
    this.dbPath = dbPath;
    this.queryGeneratorFunc = queryGeneratorFunc;
  }

  /* Fetches madrid_attachment table and keys it by attachment_guid */
  fetchMadridAttachmentsTable() {
    var result = {};

    return new Promise((resolve) => {
      if (!this.madridAttachments) {
        this.db.serialize(() => {
          this.db.each('SELECT * from madrid_attachment', (error, row) => {
            // get an overall map for relating data
            result[row.attachment_guid] = row;
          }, function() { // FINISHED CALLBACK
            this.madridAttachments = result;
            resolve(result);
          });
        });
      }
      else {
        resolve(this.madridAttachments);
      }
    });
  }

  getFullPathName(filename) {
    return path.join(this.dbPath, filename);
  }

  processMadridAttachments(row, callback) {
    // The first version of iMessage was called "madrid"
    let attachmentInfo = row._madrid_attachment_info;

    if (attachmentInfo && attachmentInfo.length > 0) {
      this.fetchMadridAttachmentsTable().then(attachments => {
        var attachmentGuids = attachmentInfo.slice(attachmentInfo.indexOf("\x01+$") + 3, attachmentInfo.length - 2);
        // this might be multiple guids separated by weird special characters
        let guids = attachmentGuids.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/g);
        row.attachments = guids.filter(guid => attachments[guid]).map((guid) => {
          var attachmentInfo = attachments[guid];

          return {
            path:  this.getFullPathName(attachmentInfo.filename),
            type:  attachmentInfo.mime_type
          };
        });
        callback(null, row);
      });
    }
    else {
      callback(null, row);
    }
  }

  processOldSMSAttachments(row, callback) {
    // iOS 5 database
    let attachmentQuery = this.queryGeneratorFunc(row.msg_id);
    let attachments = [];
    this.db.each(attachmentQuery, (error, attach) => {
      if (!row.message_text && attach.attachment_data && attach.attachment_mime_type === 'text/plain') {
        // iOS5 included text as attachments when there were other attachments
        row.message_text = attach.attachment_data.toString();
      }
      else if (attach.attachment_path) {
        attachments.push({
          path: this.getFullPathName(attach.attachment_path),
          type: attach.attachment_mime_type
        });
      }
    }, function() {
      row.attachments = attachments;
      callback(null, row);
    });
  }

  _transform(row, encoding, callback) {
    if (row._madrid_attachment_info) {
      this.processMadridAttachments(row, callback);
    }
    else if (row.attachment_count > 0 && row.is_madrid !== undefined) {
      this.processOldSMSAttachments(row, callback);
    }
    else if (row.attachment_count > 0) {
      let attachmentQuery = this.queryGeneratorFunc(row.msg_id);
      let attachments = [];
      this.db.each(attachmentQuery, (error, row) => {
        attachments.push({
          path: row.attachment_path,
          type: row.attachment_mime_type
        });
      }, function() {
        row.attachments = attachments;
        callback(null, row);
      });
    }
    else {
      row.attachments = [];
      callback(null, row);
    }
  }
}

module.exports = FetchAttachmentsStream;
