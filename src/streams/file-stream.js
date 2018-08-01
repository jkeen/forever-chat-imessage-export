const { Writable } = require('stream');

class FileStream extends Writable {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.options = options;
  }

  _write(object, encoding, callback) {
    callback(null, "");
  }
}

module.exports = FileStream;
