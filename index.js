#!/usr/bin/env node

const importer = require('./index');

module.exports = importer;

if (!module.parent) {
  require('./src/command-line')();
}
