var setupCommands = require('./src/setupCommands');

var crc16 = require('crc').crc16;
var redis = require('redis');
var RedisMulti = require('./src/RedisMulti');

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
      slots = [ i * 65536 / config.clients.length, (i + 1) * 65536 / config.clients.length - 1]
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

setupCommands(RedisClustr);

RedisClustr.prototype.selectClient = function(key) {
  if (Array.isArray(key)) key = key[0];
  var slot = crc16(key);

  for (var i in this.clients) {
    if (slot >= this.clients[i].slots[0] && slot <= this.clients[i].slots[1]) {
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

  var todo = Object.keys(g).length;
  var isDone = function() {
    if (!--todo) cb();
  };

  for (var i in g) {
    this.clients[i].client[cmd](g[i], function() {
      isDone();
    })
  }
};


RedisClustr.prototype.multi = function() {
  return new RedisMulti(this);
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
