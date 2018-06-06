const { Transform } = require('stream');
const normalizePhone = require('phone');
const _ = require('lodash');
// Takes a row, and does the following:
// 1. Formats addresses in the standard format if a phone number +15125555255
// 2. Discards junk like "E:"
// 3. Combines/formats and orders 'participants' and 'me' and 'address' into participants

class FormatAddressStream extends Transform {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.addressCache = {};
  }

  formatAddress(value) {
    let cachedValue = this.addressCache[value];
    let formattedValue;

    if (!cachedValue) {
      if (!value || value === "E:") {
        formattedValue = null;
      }
      else if (value.slice(0,2) === "E:") {
        formattedValue = value.slice(2);
      }
      else {
        var formattedPhone = normalizePhone(value);
        if (formattedPhone && formattedPhone.length > 0) {
          formattedValue = formattedPhone[0];
        }
        else {
          formattedValue = value;
        }
      }
      this.addressCache[value] = formattedValue;
    }
    return cachedValue || value;
  }

  _transform(row, encoding, callback) {
    row.me = this.formatAddress(row.me);
    row.address = this.formatAddress(row.address);
    let listedParticipants = row.participants.split('|*--*|').map(participant => this.formatAddress(participant));

    listedParticipants.push(row.me);
    listedParticipants.push(row.address);

    row.participants = _.orderBy(_.uniq(_.compact(listedParticipants)));

    callback(null, row);
  }
}

module.exports = FormatAddressStream;
