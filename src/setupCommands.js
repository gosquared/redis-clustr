'use strict';
var commands = require('../config/commands');

module.exports = function(Class) {
  function setupCommand(cmd, conf) {
    var fn = 'doCommand';
    if (conf.multiKey && conf.group && Class.prototype.doMultiKeyCommand) fn = 'doMultiKeyCommand';

    Class.prototype[cmd] = function() {
      var args = new Array(arguments.length);
      for (var i = 0; i < args.length; i++) {
        args[i] = arguments[i];
      }

      this[fn](cmd, conf, args);
      return this;
    };
  }

  for (var i in commands) {
    setupCommand(i, commands[i]);
  }
};
