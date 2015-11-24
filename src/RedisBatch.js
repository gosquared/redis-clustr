'use strict';
var setupCommands = require('./setupCommands');

/*
Like a multi but without using the MULTI command itself, so it's useful
for batching commands into a single callback
*/

var RedisBatch = module.exports = function(cluster) {
  var self = this;
  self.cluster = cluster;
  self.queue = [];
};

RedisBatch.prototype.doCommand = function(cmd, conf, args) {
  var self = this;
  self.queue.push([ cmd, conf, args ]);
};

setupCommands(RedisBatch);

RedisBatch.prototype.exec = function(cb) {
  var self = this;

  if (!cb) {
    cb = function(err) {
      if (err) self.cluster.emit('error', err);
    };
  }

  if (!self.cluster.slots.length) {
    self.cluster.getSlots(function(err) {
      if (err) return cb(err);
      self.exec(cb);
    });
    return;
  }

  var todo = self.queue.length;
  var resp = [];
  var errors = null;

  if (!todo) return setImmediate(function() { cb(null, []); });

  var isDone = function() {
    if (!--todo) return cb(errors, resp);
  };

  var batches = {};

  self.queue.forEach(function(op, index) {
    var cmd = op[0];
    var conf = op[1];

    var parsed = self.cluster.parseArgs(op[2]);
    var args = parsed[0];
    var cb = parsed[1];

    // support multi-key commands (only run special code if there's more than one key, otherwise normal command)
    if (conf.multiKey && conf.group && args.length > conf.interval) {
      var multiTodo = args.length / conf.interval;
      var multiErrors = null;
      var multiResp = [];
      var runMultiGroup = function(cli, multiKeys, multiIndex) {
        var b = batches[cli.address] || (batches[cli.address] = cli.batch());
        self.cluster.commandCallback(cli, cmd, multiKeys, function(err, res) {
          if (err) {
            if (!multiErrors) multiErrors = [];
            multiErrors.push(err);
          }
          multiResp[multiIndex] = res;
          if (!--multiTodo) {
            multiResp = conf.group(multiResp);
            cb(multiErrors, multiResp);
            resp[index] = multiResp;
            isDone();
          }
        });
        b[cmd].apply(b, multiKeys);
      };
      for (var i = 0; i < multiTodo; i++) {
        var multiKeys = args.slice(i * conf.interval, (i + 1) * conf.interval);
        var cli = self.cluster.selectClient(multiKeys[0], conf);
        if (!cli[cmd]) return cb(new Error('NodeRedis doesn\'t know the ' + cmd + ' command'));
        runMultiGroup(cli, multiKeys, i);
      }
      return;
    }

    var cli;
    if (cmd === 'eval' || cmd === 'evalsha') {
      var numKeys = args[1];
      if (!numKeys) {
        cli = self.getRandomConnection();
      } else {
        // select based on the first KEYS argument
        // we *could* validate that all keys are together, but it's easier
        // to allow redis to error instead
        cli = self.cluster.selectClient(args[2], {});
      }
    } else {
      cli = self.cluster.selectClient(args, conf);
    }

    var b = batches[cli.address] || (batches[cli.address] = cli.batch());
    if (!b[cmd]) return cb(new Error('NodeRedis doesn\'t know the ' + cmd + ' command'));

    self.cluster.commandCallback(cli, cmd, args, function(err, res) {
      cb(err, res);
      if (err) {
        if (!errors) errors = [];
        errors.push(err);
      }
      resp[index] = res;
      isDone();
    });

    b[cmd].apply(b, args);
  });

  for (var i in batches) batches[i].exec();
};
