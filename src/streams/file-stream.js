const { Writable } = require('stream');
var fs = require('fs');  // file system
const prettyoutput = require('prettyoutput');

class FileStream extends Writable {
  constructor(filePath, totalCount, options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.options = options;
    this.totalCount = totalCount;
    this.count = 0;
    this.filePath = filePath;
    this.wstream = fs.createWriteStream(filePath);
  }

  _write(object, encoding, callback) {
    var item = JSON.stringify(object, null, '    ');
    this.count += 1;
    var _count = this.count;


    if (this.totalCount === 1) {
      item = `[${item}]`;
    }
    else {
      if (this.count === 1) {
        item = '[' + item;
      }
      else if (this.count === this.totalCount) {
        item = ", " + item + ']';
      }
      else {
        item = ", " + item;
      }
    }

    var _this = this;
    this.wstream.write(item, 'utf8', function() {
      if (_count === _this.totalCount) {
        console.log('hellooo');
        // _this.wstream.close();
        _this.end();
        callback(null);
      }
      else {
        callback(null);
      }
    });

  }
}

module.exports = FileStream;
