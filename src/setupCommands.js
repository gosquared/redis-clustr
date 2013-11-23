var commands = require('../config/commands');
var multiKeyCommands = require('../config/multiKeyCommands');

module.exports = function(Class) {
  function setupCommand(cmd) {

    if (multiKeyCommands[cmd]) {
      Class.prototype[cmd] = function() {
        this.multiKeyCommand.apply(this, [ cmd, multiKeyCommands[cmd] ].concat(arguments));
        return this;
      };
      return;
    }

    Class.prototype[cmd] = function() {
      this.command(cmd, arguments);
      return this;
    };
    return;
  };

  for (var i = 0; i < commands.length; i++) {
    setupCommand(commands[i].replace(/ /g, '_'));
  }
}
