var redis = require('redis').createClient();
var fs = require('fs');

var commands = {};
redis.command(function(err, res) {
  redis.quit();
  for (var i = 0; i < res.length; i++) {
    var c = res[i];
    commands[c[0]] = {
      // multiKey: c[4] === -1,
      // interval: c[5],
      readOnly: c[2].indexOf('readonly') !== -1
    };
  }

  var file = 'module.exports = ' + JSON.stringify(commands, null, 2) + ';\n';
  fs.writeFileSync('./config/commands.js', file);
});
