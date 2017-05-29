(function() {
  var start   = process.hrtime();
  var enabled = false;

  // var debug = function(message) {
  //   console.log(message);
  // }

  module.exports = {
    log: function debug(note){
      if (!!enabled) {
        var precision = 3; // 3 decimal places
        var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
        console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
        start = process.hrtime(); // reset the timer
      }
    },
    setEnabled: function(e) {
      enabled = e;
    }
  };
})();
