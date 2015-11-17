var setupCommands = require('./setupCommands');
var multiKeyCommands = require('../config/multiKeyCommands');

/*
Like a multi but without using the MULTI command itself, so it's useful
for batching commands into a single callback
*/

var RedisBatch = module.exports = function(cluster) {
  var self = this;
  self.cluster = cluster;
  self.queue = [];
};

RedisBatch.prototype.command = function(cmd, args) {
  var self = this;
  self.queue.push([ cmd, args ]);
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

  if (!todo) return setImmediate(function() { cb(null); });

  var isDone = function() {
    if (!--todo) return cb(errors, resp);
  };

  var batches = {};

  self.queue.forEach(function(op, index) {
    var cmd = op[0];
    var keys = Array.prototype.slice.call(op[1]);

    var cb = function(err) {
      if (err) self.cluster.emit('error', err);
    };
    if (typeof keys[keys.length - 1] === 'function') cb = keys.pop();

    var first = keys[0];
    if (Array.isArray(first)) {
      keys = first;
    }

    // support multi-key commands (only run special code if there's more than one key, otherwise normal command)
    var multiConf = multiKeyCommands[cmd];
    if (multiConf && keys.length > multiConf.interval) {
      var multiGroups = [];
      for (var i = 0; i < keys.length; i += multiConf.interval) {
        multiGroups.push(keys.slice(i, i + multiConf.interval));
      }
      var multiTodo = multiGroups.length;
      var multiErrors = null;
      var multiResp = [];
      multiGroups.forEach(function(multiKeys, multiIndex) {
        var cli = self.cluster.selectClient(multiKeys[0]);
        var b = batches[cli.address] || (batches[cli.address] = cli.batch());
        self.cluster.commandCallback(cli, cmd, multiKeys, function(err, res) {
          if (err) {
            if (!multiErrors) multiErrors = [];
            multiErrors.push(err);
          }
          multiResp[multiIndex] = res;
          if (!--multiTodo) {
            multiResp = multiConf.group(multiResp);
            cb(multiErrors, multiResp);
            resp[index] = multiResp;
            isDone();
          }
        });
        b[cmd].apply(b, multiKeys);
      });
      return;
    }

    var cli = self.cluster.selectClient(keys);
    var b = batches[cli.address] || (batches[cli.address] = cli.batch());

    self.cluster.commandCallback(cli, cmd, keys, function(err, res) {
      cb.apply(this, arguments);
      if (err) {
        if (!errors) errors = [];
        errors.push(err);
      }
      resp[index] = res;
      isDone();
    });

    b[cmd].apply(b, keys);
  });

  for (var i in batches) batches[i].exec();
};
