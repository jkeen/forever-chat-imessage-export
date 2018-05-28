import commandLine from './command-line';
import exporter from './import';

let result;
if (!module.parent) {
  result = commandLine;
}
else {
  result = exporter;
}

export default result;
