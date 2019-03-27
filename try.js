#!/usr/bin/env node

var importer       = require('./src/import');
var expandHomeDir  = require('expand-home-dir');

var importData    = importer("~/Library/Messages/chat.db", {limit: 100}).then(function(data) {

  // stream.on('data', (chunk) => console.log(chunk));
  // stream.on('finish', () => console.log('end'))
  console.log(JSON.stringify(data));
}).catch(function(e) {
  console.error(e);
});
