const { Readable } = require('stream');

class ReadDatabaseRow extends Readable {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.debug = options.debug;
  }
  _read() {

  }
}

module.exports = ReadDatabaseRow;
