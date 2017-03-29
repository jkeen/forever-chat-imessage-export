var importer       = require('./index');
var expandHomeDir  = require('expand-home-dir');

var importData     = importer(expandHomeDir("/Users/jeff/Desktop/Chat\ Archives/7150bddde00b1ec39c3d72ea77aae69fa333b443/3d0d7e5fb2ce288813306e4d4636395e047a3d28")).then(function(d) {
  console.log(JSON.stringify(d));
}).catch(function(e) {
  console.error(e);
});


// var importData     = importer(expandHomeDir("~/Library/Messages/chat.db"), {limit: 1000}).then(function(d) {
//   console.log(JSON.stringify(d));
// }).catch(function(e) {
//   console.error(e);
// });
//
