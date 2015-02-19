var setupCommands = require('./setupCommands');
var crc = require('./crc16-xmodem');
var redis = require('redis');
var RedisBatch = require('./RedisBatch');
var Events = require('events').EventEmitter;
var util = require('util');

var RedisClustr = module.exports = function(config) {
  var self = this;

  Events.call(self);

  // handle just an array of clients
  if (Array.isArray(config)) {
    config = {
      servers: config
    };
  }

  self.config = config;
  self.slots = [];
  self.connections = {};

  for (var i = 0; i < config.servers.length; i++) {
    var c = config.servers[i];

    var name = c.host + ':' + c.port;
    self.connections[name] = self.getClient(c.port, c.host);
  }

  // fetch slots from the cluster immediately to ensure slots are correct
  self.getSlots();

  // ability to update slots on an interval (should be unnecessary)
  if (config.slotInterval) setInterval(self.getSlots.bind(self), config.slotInterval);
};

util.inherits(RedisClustr, Events);

RedisClustr.prototype.getClient = function(port, host) {
  var self = this;
  var name = host + ':' + port;

  // already have a connection to this client, return that
  if (self.connections[name]) return self.connections[name];

  var createClient = self.config.createClient || redis.createClient;
  var cli = createClient(port, host, self.config.redisOptions);

  cli.on('error', function(err) {
    if (/Redis connection to .* failed.*/.test(err.message)) {
      self.emit('connectionError', err, cli);
      self.getSlots();
      return;
    }

    // re-emit the error ourselves
    self.emit('error', err, cli);
  });

  return self.connections[name] = cli;
};

RedisClustr.prototype.getRandomConnection = function(exclude) {
  var self = this;

  var available = Object.keys(self.connections).filter(function(f) {
    return f && (!exclude || exclude.indexOf(f) === -1);
  });

  // Fisher-Yates shuffle
  var currentIndex = available.length;
  while (currentIndex) {
    var randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    var tmp = available[currentIndex];
    available[currentIndex] = available[randomIndex];
    available[randomIndex] = tmp;
  }

  return self.connections[available[0]];
};

RedisClustr.prototype.getSlots = function(cb) {
  var self = this;

  var alreadyRunning = !!self._slotQ;
  if (!alreadyRunning) self._slotQ = [];
  if (cb) self._slotQ.push(cb);
  if (alreadyRunning) return;

  var runCbs = function() {
    for (var i = 0; i < self._slotQ.length; i++) {
      self._slotQ[i].apply(self._slotQ[i], arguments);
    }
    self._slotQ = false;
  }

  var exclude = [];
  var tryClient = function() {
    var client = self.getRandomConnection(exclude);
    if (!client) return runCbs(new Error('couldn\'t get slot allocation'));

    client.send_command('cluster', [ 'slots' ], function(err, slots) {
      if (err) {
        // exclude this client from then next attempt
        exclude.push(client.address);
        return tryClient();
      }

      var seenClients = [];
      self.slots = new Array(16384);

      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        var start = s[0];
        var end = s[1];
        var cli = s[2];
        var name = cli.join(':');
        seenClients.push(name);

        for (var j = start; j <= end; j++) {
          self.slots[j] = self.getClient(cli[1], cli[0]);
        }
      }

      // quit now-unused clients
      for (var i in self.connections) {
        if (!self.connections[i]) continue;
        if (seenClients.indexOf(i) === -1) {
          self.connections[i].quit();
          self.connections[i] = null;
        }
      }

      runCbs(null, self.slots);
    });
  };

  tryClient();
};

RedisClustr.prototype.selectClient = function(key) {
  var self = this;

  if (Array.isArray(key)) key = key[0];

  // support for hash tags to keep keys on the same slot
  // http://redis.io/topics/cluster-spec#multiple-keys-operations
  var openKey = key.indexOf('{');
  if (openKey !== -1) {
    var closeKey = key.indexOf('}');

    // } in key and it's not {}
    if (closeKey !== -1 && closeKey !== openKey + 1) {
      key = key.substring(openKey + 1, closeKey);
    }
  }

  var slot = crc(key) % 16384;

  // get the redis client for this slot. if we haven't got one, try any connection
  return self.slots[slot] || self.getRandomConnection();
};

RedisClustr.prototype.command = function(cmd, args) {
  var self = this;

  args = Array.prototype.slice.call(args);
  var key = args[0];

  var cb = function(){};
  if (typeof args[args.length - 1] === 'function') cb = args.pop();

  if (!key) return cb(new Error('no key for command: ' + cmd));

  var r = self.selectClient(key);
  if (!r) return cb(new Error('couldn\'t get client'));

  // number of attempts/redirects when we get connection errors
  // or when we get MOVED/ASK responses
  // https://github.com/antirez/redis-rb-cluster/blob/fd931ed34dfc53159e2f52c9ea2d4a5073faabeb/cluster.rb#L29
  var retries = 16;

  args.push(function(err) {
    if (err && err.message && retries--) {
      var moved = err.message.substr(0, 6) === 'MOVED ';
      var ask = err.message.substr(0, 4) === 'ASK ';

      if (moved || ask) {

        // key has been moved!
        // lets refetch slots from redis to get an up to date allocation
        if (moved) self.getSlots();

        // REQUERY THE NEW ONE (we've got the correct details)
        var addr = err.message.split(' ')[2];
        var saddr = addr.split(':')
        var c = self.getClient(saddr[1], saddr[0]);
        if (ask) c.send_command('asking', []);
        c[cmd].apply(c, args);
        return;
      }

      if (/Redis connection to .* failed.*/.test(err.message)) {
        self.emit('connectionError', err, r);

        // get slots and try again
        self.getSlots(function(err) {
          if (err) return cb(err);
          var r = self.selectClient(key);
          if (!r) return cb(new Error('couldn\'t get client'));
          r[cmd].apply(r, args);
        });
        return;
      }
    }

    cb.apply(cb, arguments);
  });

  r[cmd].apply(r, args);
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
    self.connections[i].quit(function() {
      if (!--todo && cb) cb();
    });
  }
};
