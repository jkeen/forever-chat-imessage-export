const { Readable } = require('stream');

// Takes a row, and looks up its attachments if it has any
// Adds an .attachments property on the row with the array of attachments and returns it

class ReadDatabaseRow extends Readable {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
  }

  _read(size) {
    // console.log(size);
    // console.log(size);
    // this.push(null)
    // callback(null, row);
  }
}

module.exports = ReadDatabaseRow;
