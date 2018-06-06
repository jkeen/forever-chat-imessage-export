const { Writable } = require('stream');
const prettyoutput = require('prettyoutput');

class OutputStream extends Writable {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.options = options;
  }

  _write(object, encoding, callback) {
    let simple = {
      from: object.sender,
      to: object.receiver.join(", "),
      date: object.date,
      text: object.message_text
    };

    if (this.options.compact) {
      callback(null, process.stdout.write(prettyoutput(simple) + "\n\n"));
    }
    else {
      callback(null, process.stdout.write(prettyoutput(object) + "\n\n"));
    }
  }
}

module.exports = OutputStream;
