#!/usr/bin/env node

var importer       = require('./src/import');
var expandHomeDir  = require('expand-home-dir');

var importData    = importer("~/Library/Messages/chat.db", {limit: 1000}).then(function(d) {
  console.log(JSON.stringify(d));
}).catch(function(e) {
  console.error(e);
});
