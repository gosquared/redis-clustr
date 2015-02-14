var setupCommands = require('./setupCommands');
var crc = require('./crc16-xmodem');
var redis = require('redis');
var RedisBatch = require('./RedisBatch');

var RedisClustr = module.exports = function(config) {
  var self = this;

  // handle just an array of clients
  if (Array.isArray(config)) {
    config = {
      servers: config
    };
  }

  self.config = config;
  self.clients = {};
  self.connections = {};

  for (var i = 0; i < config.servers.length; i++) {
    var c = config.servers[i];

    var name = c.host + ':' + c.port;

    self.clients[name] = {
      name: name,
      client: self.getClient(c.port, c.host),
      // slots will be reassigned as soon as we get a response from `cluster slots`
      slots: [ [ 0, Infinity ] ]
    };
  }

  // fetch slots from the cluster immediately to ensure slots are correct
  self.getSlots();

  // ability to update slots on an interval (should be unnecessary)
  if (config.slotInterval) setInterval(self.getSlots.bind(self), config.slotInterval);
};

RedisClustr.prototype.getClient = function(port, host) {
  var self = this;
  var name = host + ':' + port;

  // already have a connection to this client, return that
  if (self.connections[name]) return self.connections[name];

  var createClient = self.config.createClient || redis.createClient;
  var cli = createClient(port, host);
  return self.connections[name] = cli;
};

RedisClustr.prototype.getSlots = function(clientIndex) {
  var self = this;

  if (self.slotting) return;
  self.slotting = true;

  clientIndex = clientIndex || 0;

  // get the client at the index we've been given
  self.clients[Object.keys(self.clients)[clientIndex]].client.send_command('cluster', [ 'slots' ], function(err, slots) {
    if (err) {
      clientIndex++;

      // we've run out of clients to try...
      if (clientIndex >= self.clients.length) {
        self.slotting = false;
        // throw new Error('couldn\'t get slot allocation');
        return;
      }

      // try the next client
      self.getSlots(clientIndex);
      return;
    }

    self.clients = {};

    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      var start = s[0];
      var end = s[1];
      var cli = s[2];
      var name = s[2].join(':');

      if (!self.clients[name]) {
        self.clients[name] = {
          name: name,
          client: self.getClient(cli[1], cli[0]),
          slots: []
        };
      }

      // add this slot range to the client
      self.clients[name].slots.push([ start, end ]);
    }

    self.slotting = false;
  });
};

RedisClustr.prototype.selectClient = function(key) {
  var self = this;

  if (Array.isArray(key)) key = key[0];
  var slot = crc(key) % 16384;

  for (var c in self.clients) {
    var client = self.clients[c];
    for (var i = 0; i < client.slots.length; i++) {
      var range = client.slots[i];
      if (slot >= range[0] && slot <= range[1]) {
        return client;
      }
    }
  }
};

RedisClustr.prototype.command = function(cmd, args) {
  var self = this;

  args = Array.prototype.slice.call(args);
  var key = args[0];

  if (!key) {
    throw new Error('no key for command: ' + cmd);
  }

  var r = self.selectClient(key);

  var cb = function(){};
  if (typeof args[args.length - 1] === 'function') cb = args.pop();

  args.push(function(err) {
    if (err && err.message && err.message.substr(0, 6) === 'MOVED ') {
      // key has been moved!
      // lets refetch slots from redis to get an up to date allocation
      self.getSlots();

      // REQUERY THE NEW ONE (we've got the correct details)
      var addr = err.message.split(' ')[2];
      var saddr = addr.split(':')
      var c = self.createClient(saddr[1], saddr[0]);
      c[cmd].apply(c, args);
      return;
    }

    cb.apply(cb, arguments);
  });

  r.client[cmd].apply(r.client, args);
};

// redis cluster requires multi-key commands to be split into individual commands
RedisClustr.prototype.multiKeyCommand = function(cmd, interval, args) {
  var self = this;

  var cb = function(){};

  var keys = Array.prototype.slice.call(args);
  if (typeof keys[keys.length -1] === 'function') cb = keys.pop();

  var first = keys[0];
  if (Array.isArray(first)) {
    keys = first;
  }

  // already split into an individual command
  if (keys.length === interval) {
    return self.command(cmd, args);
  }

  // batch the multi-key command into individual ones
  var b = self.batch();
  for (var i = 0; i < keys.length; i += interval) {
    b[cmd].apply(b, keys.slice(i, i + interval));
  }

  b.exec(cb);
};

setupCommands(RedisClustr);

RedisClustr.prototype.batch = RedisClustr.prototype.multi = function() {
  var self = this;
  return new RedisBatch(self);
};

RedisClustr.prototype.quit = function(cb) {
  var self = this;
  var todo = Object.keys(self.connections).length;

  for (var i in self.connections) {
    self.connections[i].client.quit(function() {
      if (!--todo) cb();
    });
  }
};
