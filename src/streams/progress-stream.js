
const { Transform } = require('stream');
// const Promise    = require('bluebird');
var ProgressBar     = require('ts-progress');

class ProgressStream extends Transform {
  constructor(totalCount, options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.progressBar = ProgressBar.create({
      total: totalCount,
      pattern: 'Importing: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ', textColor: 'blue',
      updateFrequency: 200
    });
  }

  _transform(row, encoding, callback) {
    this.rowCount ++;
    this.progressBar.update();
    callback(null, row);
  }
}

module.exports = ProgressStream;
