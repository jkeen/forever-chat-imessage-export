var commandLine = require('./command-line');
var exporter    = require('./import');

let result;
if (!module.parent) {
  result = commandLine;
}
else {
  result = exporter;
}

module.exports = result;
