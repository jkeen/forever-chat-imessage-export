
const { Transform } = require('stream');
// const Promise    = require('bluebird');
var ProgressBar     = require('ts-progress');

class ProgressStream extends Transform {
  constructor(totalCount, options, onFinish) {
    super(Object.assign({}, options, { objectMode: true }));
    this.totalCount = totalCount;
    this.onFinish = onFinish;
    this.rowCount = 0;
    if (options.showProgress) {
      this.progressBar = ProgressBar.create({
        total: totalCount,
        pattern: 'Importing: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ', textColor: 'blue',
        updateFrequency: 200
      });
    }
  }

  _transform(row, encoding, callback) {
    this.rowCount ++;
    if (this.progressBar) {
      this.progressBar.update();
    }
    callback(null, row);
    if (this.totalCount === this.rowCount && this.onFinish) {
      this.onFinish();
    }
  }
}

module.exports = ProgressStream;
