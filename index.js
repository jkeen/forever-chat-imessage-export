#!/usr/bin/env node

const importer = require('./src/import');

module.exports = importer;

if (!module.parent) {
  require('./src/command-line')();
}
