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

RedisBatch.prototype.command = function(cmd, args) {
  var self = this;
  self.queue.push([ cmd, args ]);
};

setupCommands(RedisBatch);

RedisBatch.prototype.exec = function(cb) {
  var self = this;

  if (!cb) cb = function(){};

  var todo = self.queue.length;
  var resp = new Array(self.queue.length);
  var errors = null;

  if (!todo) return setImmediate(function() { cb(null); });

  var isDone = function() {
    if (!--todo) return cb(errors, resp);
  };

  self.queue.forEach(function(op, index) {
    var cmd = self.cluster[op[0]];
    var keys = Array.prototype.slice.call(op[1]);

    var cb = false;
    if (typeof keys[keys.length -1] === 'function') cb = keys.pop();

    var first = keys[0];
    if (Array.isArray(first)) {
      keys = first;
    }

    keys.push(function(err, res) {
      if (cb) cb.apply(this, arguments);
      if (err) {
        if (!errors) errors = [];
        errors.push(err);
      }
      resp[index] = res;
      isDone();
    });

    cmd.apply(self.cluster, keys);
  });
};
