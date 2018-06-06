const { Transform } = require('stream');
const normalizePhone = require('phone');
const Promise =  require('bluebird');
const addressImport = require('address-book-export');

class IdentifyStream extends Transform {
  constructor(options) {
    super(Object.assign({}, options, { objectMode: true }));
    this.contactIndex = {};
    this.contactIndexBuilt = false;
  }

  buildAddressIndex() {
    return new Promise((resolve) => {
      if (this.contactIndexBuilt) {
        resolve(this.contactIndex);
      }

      return addressImport().then(contacts => {
        contacts.forEach(contact => {

          let messengers = contact.messengers.map(c => c.address);
          let emails     = contact.emails.map(c => c.address);
          let phones     = contact.phones.map(c => c.number).map(number => normalizePhone(number)[0]);
          let keys       = [...messengers, ...emails, ...phones];
          keys.forEach(key => {
            this.contactIndex[key] = contact;
          });
        });

        this.contactIndexBuilt = true;
        resolve(this.contactIndex);
      });
    });
  }

  annotateWithName(lookupContact, address) {
    let contact = lookupContact[address];

    if (contact) {
      return `${contact.first_name} ${contact.last_name} <${address}>`;
    }
    else {
      return address;
    }
  }

  _transform(message, encoding, callback) {
    this.buildAddressIndex().then((lookupContact) => {
      message.sender = this.annotateWithName(lookupContact, message.sender);

      if (message.receiver) {
        if (message.receiver.length > 0) {
          message.receiver = message.receiver.map(receiver => this.annotateWithName(lookupContact, receiver));
        }
        else {
          message.receiver =  this.annotateWithName(lookupContact, message.receiver);
        }
      }

      callback(null, message);
    });
  }
}

module.exports = IdentifyStream;
