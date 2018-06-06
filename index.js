#!/usr/bin/env node

(function(){
  module.exports = require('./src/import').importData;

  if (!module.parent) {
    require('./src/command-line')();
  }
})();
