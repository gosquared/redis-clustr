var setupCommands = require('../src/setupCommands');

/*
Like a multi but without using the MULTI command itself, so it's useful
for batching commands into a single callback
*/

var RedisBatch = module.exports = function(cluster) {
  this.cluster = cluster;
  this.queue = [];
};

RedisBatch.prototype.command = function(cmd, args) {
  this.queue.push([ cmd, args ]);
};

setupCommands(RedisBatch);

RedisBatch.prototype.exec = function(cb) {
  if (!cb) cb = function(){};

  var todo = this.queue.length;
  var resp = new Array(this.queue.length);
  var errors = null;

  if (!todo) return setImmediate(function() { cb(null); });

  var isDone = function() {
    if (!--todo) return cb(errors, resp);
  };

  this.queue.forEach(function(op, index) {
    var cmd = this.cluster[op[0]];
    var keys = Array.prototype.slice.call(op[1]);

    var cb = false;
    if (typeof keys[keys.length -1] === 'function') cb = keys.pop();

    var first = keys[0];
    if (Array.isArray(first)) {
      keys = first;
    }

    keys.push(function(err, res) {
      if (cb) cb.apply(this, arguments);
      if (err && !errors) errors = [];
      if (err) errors.push(err);
      resp[index] = res;
      isDone();
    });

    cmd.apply(this.cluster, keys);
  }.bind(this));
};
