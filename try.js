var importer       = require('./index');
var expandHomeDir  = require('expand-home-dir');
var importData     = importer(expandHomeDir("~/Library/Messages/chat.db")).then(function(d) {
  console.log(d);
});
