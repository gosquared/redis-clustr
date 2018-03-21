var redis = require('redis').createClient();
var fs = require('fs');
var beautify = require('js-beautify').js_beautify;

var extraConfig = require('../config/commandsConfig');

var commands = {};
redis.command(function(err, res) {
  redis.quit();
  if (err) return console.error(err);

  // Ensure stable sorting of commands to avoid git diff churn every time we regenerate
  res.sort(function(a, b) {
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });

  for (var i = 0; i < res.length; i++) {
    var c = res[i];
    var cnf = extraConfig[c[0]] || {};
    cnf.multiKey = c[4] === -1;
    cnf.interval = c[5];
    cnf.keyless = c[5] === 0 && c[2].indexOf('movablekeys') === -1;
    cnf.readOnly = c[2].indexOf('readonly') !== -1;
    commands[c[0]] = cnf;
  }

  var file = '// Generated using tools/commands.js and config/commandsConfig.js on ' + new Date().toUTCString() + '\n\n';
  file += beautify('module.exports = ' + convert(commands), { indent_size: 2 }) + ';\n';
  fs.writeFileSync('./config/commands.js', file);
});

// horrible function to convert a JS object to a string (so we can write the config file)
function convert(obj) {
  var type = typeof obj;
  if (type === 'object' && Array.isArray(obj)) {
    return '[' + obj.map(convert) + ']';
  }

  if (obj && type === 'object') {
    var string = [];
    for (var i in obj) {
      var prop = i;
      if (prop.indexOf('-') !== -1) prop = "'" + prop + "'";
      string.push(prop + ':' + convert(obj[i]));
    }
    return '{' + string + '}';
  }

  if (type === 'function') {
    return obj.toString();
  }

  return JSON.stringify(obj);
}
