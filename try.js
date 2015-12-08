var importer       = require('./index');

var importData     = importer("/Users/jeff/Library/Messages/chat.db").then(function(d) {
  // console.log(d);
});
