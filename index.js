var setupCommands = require('./src/setupCommands');

var crc16 = require('crc').crc16;
var redis = require('redis');
var RedisMulti = require('./src/RedisMulti');
var RedisBatch = require('./src/RedisBatch');

var RedisClustr = module.exports = function(config) {

  // handle just an array of clients
  if (Array.isArray(config)) {
    config = {
      clients: config
    };
  }

  this.clients = {};

  for (var i = 0; i < config.clients.length; i++) {
    var c = config.clients[i];

    var slots = c.slots;

    // no slots specified, automatically allocate evenly
    if (!slots) {
      slots = [ i * 65536 / config.clients.length, (i + 1) * 65536 / config.clients.length ]
    }

    var name = c.name || c.host + ':' + c.port;

    this.clients[name] = {
      index: i,
      name: name,
      client: c.client || redis.createClient(c.port, c.host, c.options),
      slots: slots
    }
  }
};

RedisClustr.prototype.selectClient = function(key) {
  if (Array.isArray(key)) key = key[0];
  var slot = crc16(key);

  for (var i in this.clients) {
    if (slot >= this.clients[i].slots[0] && slot < this.clients[i].slots[1]) {
      return this.clients[i];
    }
  }
};

RedisClustr.prototype.command = function(cmd, args) {

  var key = args[0];

  if (!key) {
    console.log(cmd, args);
    throw new Error('no key');
  }

  var r = this.selectClient(key);

  r.client[cmd].apply(r.client, args);
};

RedisClustr.prototype.multiKeyCommand = function(cmd, interval, args) {
  var cb = function(){};

  var keys = Array.prototype.slice.call(args);
  if (typeof keys[keys.length -1] === 'function') cb = keys.pop();

  var first = keys[0];
  if (Array.isArray(first)) {
    keys = first;
  }

  var g = this.multipleKeys(keys, interval);
  var errors = null;
  var resp = new Array(keys.length / interval);

  var todo = Object.keys(g).length;
  var isDone = function() {
    if (!--todo) {
      if (resp.every(function(r) { return !isNaN(parseInt(r)); })) {
        resp = resp.reduce(function(prev, cur) {
          return prev + cur;
        }, 0);
      }

      cb(errors, resp);
    }
  };

  for (var i in g) {
    this.clients[i].client[cmd](g[i], function(keyz, err, res) {
      if (err && !errors) errors = [];
      if (err) {
        errors.push(err);
        isDone();
        return;
      }

      // trying to reconstruct the response as best we can
      if (Array.isArray(res)) {
        for (var j = 0; j < res.length; j++) {
          var ind = keys.indexOf(keyz[j / interval]) / interval;
          if (ind < 0) continue;
          resp[ind] = res[j];
        }
      } else {
        for (var j = 0; j < keyz.length; j += interval) {
          // this is usually for `del` commands which return the number
          // we can then sum it later
          resp[keys.indexOf(keyz[j]) / interval] = res / (keyz.length / interval);
        }
      }

      isDone();
    }.bind(this, g[i]));
  }
};

setupCommands(RedisClustr);

RedisClustr.prototype.multi = function() {
  return new RedisMulti(this);
};

RedisClustr.prototype.batch = function() {
  return new RedisBatch(this);
};

RedisClustr.prototype.multipleKeys = function(keys, interval) {
  var groups = {};
  interval = interval || 1;

  for (var i = 0; i < keys.length; i += interval) {
    var r = this.selectClient(keys[i]);

    if (!groups[r.name]) groups[r.name] = [];
    [].push.apply(groups[r.name], keys.slice(i, i + interval));
  }

  return groups;
};

RedisClustr.prototype.quit = function(cb) {
  var todo = Object.keys(this.clients).length;

  for (var i in this.clients) {
    this.clients[i].client.quit(function() {
      if (!--todo) cb();
    });
  }
};
