
const { Transform } = require('stream');
const ConvertRow = require('../convert-row');

class TransformStream extends Transform {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
  }

  _transform(row, encoding, callback) {
    // EXPECTATIONS:
    // - that row will have attachments already fetched and provided
    // - that row will have attachments
    // - that row's addresses and participants will have been formatted

    let transform = new ConvertRow(row, row.attachments);
    callback(null, transform.process());
  }
}

module.exports = TransformStream;
