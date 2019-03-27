const { Readable } = require('stream');

class ReadDatabaseRow extends Readable {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
  }
  _read() {

  }
}

module.exports = ReadDatabaseRow;
