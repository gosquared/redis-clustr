var commands = require('../config/commands');
var multiKeyCommands = require('../config/multiKeyCommands');

module.exports = function(Class) {
  function setupCommand(cmd, conf) {
    if (multiKeyCommands[cmd] && Class.prototype.doMultiKeyCommand) {
      Class.prototype[cmd] = function() {
        this.doMultiKeyCommand(cmd, conf, multiKeyCommands[cmd], arguments);
        return this;
      };
    } else {
      Class.prototype[cmd] = function() {
        this.doCommand(cmd, conf, arguments);
        return this;
     };
    }
  }

  for (var i in commands) {
    setupCommand(i, commands[i]);
  }
};
