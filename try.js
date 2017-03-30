var importer       = require('./index');
var expandHomeDir  = require('expand-home-dir');

// var importData     = importer(expandHomeDir("test/dbs/homer.db")).then(function(d) {
//   console.log(JSON.stringify(d));
// }).catch(function(e) {
//   console.error(e);
// });

var importData     = importer(expandHomeDir("~/Library/Messages/chat.db"), {limit: 1000}).then(function(d) {
  console.log(JSON.stringify(d));
}).catch(function(e) {
  console.error(e);
});
