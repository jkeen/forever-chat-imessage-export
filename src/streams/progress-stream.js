
const { Transform } = require('stream');
// const Promise       = require('bluebird');
var ProgressBar     = require('ts-progress');

class ProgressStream extends Transform {
  constructor(db, countQuery, options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.db = db;
    this.countQuery = countQuery;

    this.db.serialize(() => {
      console.log(this.countQuery);
      this.db.all(this.countQuery, (error, row) => {
        // this.progressBar = ProgressBar.create({
        //   total: Math.min(row[0]['count'], options.limit),
        //   pattern: 'Importing: {bar} {current}/{total} | Remaining: {remaining} | Elapsed: {elapsed} ', textColor: 'blue',
        //   updateFrequency: 350
        // });
      });
    });
  }

  _transform(row, encoding, callback) {
    // if (this.progressBar) {
    //   this.progressBar.update();
    // }

    callback(null, row);
  }
}

module.exports = ProgressStream;
