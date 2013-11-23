var setupCommands = require('../src/setupCommands');

/*
This obviously isn't a proper multi, it splits the multis into lots of individual ones (per server)
Then allows exec with a proper callback

Note: individual function callbacks may not be called in order.
*/

var RedisMulti = module.exports = function(cluster) {
  this.cluster = cluster;
  this.queues = {};
  this.queue = [];

  // object with keys of the index of the original command, containing an object with the shards and indexes of the commands
  // within those individual multis. AAAAAAHHHHHH.
  this.splitCommands = {};
};

setupCommands(RedisMulti);

RedisMulti.prototype.command = function(cmd, args) {

  var key = args[0];

  if (!key) {
    console.log(cmd, args);
    throw new Error('no key');
  }

  var r = this.cluster.selectClient(key);

  var multi = this.queues[r.name];
  if (!multi) {
    multi = this.queues[r.name] = r.client.multi();
  }

  multi[cmd].apply(multi, args);

  this.queue.push(multi.queue[multi.queue.length -1]);
};

RedisMulti.prototype.multiKeyCommand = function(cmd, interval, args) {
  var cb = function(){};

  var keys = Array.prototype.slice.call(args);
  if (typeof keys[keys.length -1] === 'function') cb = keys.pop();

  var first = keys[0];
  if (Array.isArray(first)) {
    keys = first;
  }

  var g = this.cluster.multipleKeys(keys, interval);

  for (var i in g) {

    var multi = this.queues[i];
    if (!multi) {
      multi = this.queues[i] = this.cluster.clients[i].client.multi();
    }

    if (!this.splitCommands[this.queue.length]) this.splitCommands[this.queue.length] = {};

    this.splitCommands[this.queue.length][i] = multi.queue.length;

    multi[cmd].apply(multi, g[i]);
  }

  this.queue.push(this.queue.length);
};

RedisMulti.prototype.exec = function(cb) {
  var self = this;

  var q = this.queue;
  var resp = new Array(q.length);

  var todo = Object.keys(this.queues).length;
  var done = 0;
  var isDone = function(err) {
    if (err) console.log(err);
    if (++done !== todo) return;

    // TODO: recompile split commands responses

    if (cb) cb(null, resp);
  }

  function execQueue(queue) {
    queue.exec(function(err, res) {

      if (err) return isDone(err);

      var qu = queue.queue;

      for (var i = 1; i < qu.length; i++) {
        var cmd = qu[i];
        var ind = q.indexOf(cmd);

        // not found
        if (ind < 0) continue;
        resp[ind] = res[i - 1];
      }

      isDone();
    });
  };

  for (var i in this.queues) {
    execQueue(this.queues[i]);
  }
};
