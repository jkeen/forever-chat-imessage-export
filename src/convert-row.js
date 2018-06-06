var Crypto         = require('crypto');
var _              = require('lodash');
var normalizePhone = require('phone');

class ConvertRow {
  constructor(row, attachments, utils) {
    this.row = row;
    this.attachments = attachments;
  }
}
