var RSVP               = require('rsvp');
var loadMadridMessages = require('./load-from-madrid-ios/madrid');
var loadSMSMessages    = require('./load-from-madrid-ios/sms');


module.exports = function(path, version, options) {
  console.log("Querying ios5 era database");
  return loadMadridMessages(path, version, options).then(function(imessages) {
    loadSMSMessages(path, version, options).then(function(sms) {
      return imessages.concat(sms);
    });
  });
}
