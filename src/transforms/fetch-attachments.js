const { Transform } = require('stream');

// Takes a row, and looks up its attachments if it has any
// Adds an .attachments property on the row with the array of attachments and returns it

class FetchAttachmentsStream extends Transform {
  constructor(db, queryGeneratorFunc, options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.db = db;
    this.queryGeneratorFunc = queryGeneratorFunc;
  }

  _transform(row, encoding, callback) {
    if (row.attachment_count > 0) {
      let attachmentQuery = this.queryGeneratorFunc(row.msg_id);
      let attachments = [];
      this.db.each(attachmentQuery, (error, row) => {
        attachments.push({
          path: row.path,
          type: row.mime_type
        });
      });

      row.attachments = attachments;
      callback(null, row);
    }
    else {
      row.attachments = [];
      callback(null, row);
    }
  }
}

module.exports = FetchAttachmentsStream;
