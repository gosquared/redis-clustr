'use strict';
var setupCommands = require('./setupCommands');
var calculateSlot = require('cluster-key-slot');
var redis = require('redis');
var RedisBatch = require('./RedisBatch');
var Events = require('events').EventEmitter;
var util = require('util');
var Queue = require('denque');

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
  self.subscriptions = null;
  self.ready = false;
  self.connected = false;

  for (var i = 0; i < config.servers.length; i++) {
    var c = config.servers[i];
    self.getClient(c.port, c.host);
  }

  // fetch slots from the cluster immediately to ensure slots are correct
  self.getSlots();

  // ability to update slots on an interval (should be unnecessary)
  if (config.slotInterval) self._slotInterval = setInterval(self.getSlots.bind(self), config.slotInterval);
};

util.inherits(RedisClustr, Events);

RedisClustr.prototype.createClient = function(port, host) {
  var self = this;

  var createClient = self.config.createClient || redis.createClient;
  var cli = createClient(port, host, self.config.redisOptions);

  return cli;
};

/**
 * Get a Redis client via the connection cache (one per host)
 * @date   2015-02-14
 * @param  {number}   port   Port to connect to
 * @param  {string}   host   Host to connect to
 * @param  {boolean}  master Whether this client is a master or not (a slave)
 * @return {Redis}           The Redis client
 */
RedisClustr.prototype.getClient = function(port, host, master) {
  var self = this;
  var name = host + ':' + port;

  var cli = self.connections[name];

  // already have a connection to this client, return that
  if (cli) {
    cli.master = master;
    return cli;
  }

  cli = self.createClient(port, host);
  cli.master = master;

  cli.on('error', function(err) {
    if (
      err.code === 'CONNECTION_BROKEN' ||
      err.code === 'UNCERTAIN_STATE' ||
      /Redis connection to .* failed.*/.test(err.message)
    ) {
      // broken connection so force a new client to be created (node_redis will reconnect other errors)
      if (err.code === 'CONNECTION_BROKEN') self.connections[name] = null;
      self.emit('connectionError', err, cli);
      self.getSlots();
      return;
    }

    // re-emit the error ourselves
    self.emit('error', err, cli);
  });

  // as soon as one client is ready, we're connected (ready to fetch slot allocation)
  cli.on('ready', function() {
    if (!self.connected) {
      self.connected = true;
      self.emit('connect');
    }
  });

  cli.on('end', function() {
    var wasConnected = self.connected;
    self.connected = Object.keys(self.connections).some(function(c) {
      return self.connections[c] && self.connections[c].ready;
    });
    if (!self.connected && wasConnected) self.emit('disconnect');

    // setImmediate as node_redis sets emitted_end after emitting end
    setImmediate(function() {
      var wasEnded = self.ended;
      self.ended = Object.keys(self.connections).every(function(c) {
        var cc = self.connections[c];
        return !cc || (!cc.connected && cc.emitted_end);
      });
      if (self.ended && !wasEnded) self.emit('end');
    });
  });

  self.connections[name] = cli;
  return cli;
};

/**
 * Get a random Redis connection
 * @date   2015-02-18
 * @param  {array}   exclude  List of addresses to exclude (falsy to ignore none)
 * @return {Redis}            A random, ready, Redis connection.
 */
RedisClustr.prototype.getRandomConnection = function(exclude) {
  var self = this;

  var available = Object.keys(self.connections).filter(function(f) {
    return self.connections[f] && self.connections[f].ready && (!exclude || exclude.indexOf(f) === -1);
  });

  var randomIndex = Math.floor(Math.random() * available.length);

  return self.connections[available[randomIndex]];
};

/**
 * Get the cluster slot allocation
 * @date   2015-02-14
 * @param  {Function} cb
 */
RedisClustr.prototype.getSlots = function(cb) {
  var self = this;

  var q = self._slotQ;
  if (q) {
    if (!cb) return;
    if (self.config.maxQueueLength && q.length >= self.config.maxQueueLength) {
      var err = new Error('max slot queue length reached');
      if (self.config.queueShift !== false) {
        // shift the earliest queue item off and give it an error
        q.shift()(err);
      } else {
        // send this callback the error instead
        return cb(err);
      }
    }
    return q.push(cb);
  }

  self._slotQ = q = new Queue();
  if (cb) q.push(cb);

  var runCbs = function(err, slots) {
    var cb;
    while ((cb = self._slotQ.shift())) {
      cb(err, slots);
    }
    self._slotQ = false;
  };

  var exclude = [];
  var tryErrors = null;
  var tryClient = function() {
    if (typeof readyTimeout !== 'undefined') clearTimeout(readyTimeout);
    if (self.quitting) return runCbs(new Error('cluster is quitting'));

    var client = self.getRandomConnection(exclude);
    if (!client) {
      var err = new Error('couldn\'t get slot allocation');
      err.errors = tryErrors;
      return runCbs(err);
    }

    client.cluster('slots', function(err, slots) {
      if (err) {
        // exclude this client from then next attempt
        exclude.push(client.address);
        if (!tryErrors) tryErrors = [];
        tryErrors.push(err);
        return tryClient();
      }

      if (self.quitting) return runCbs(new Error('cluster is quitting'));

      var seenClients = [];
      self.slots = [];

      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        var start = s[0];
        var end = s[1];

        // array of all clients, clients[0] = master, others are slaves
        var clients = s.slice(2).map(function(c, index) {
          var name = c[0] + ':' + c[1];
          if (seenClients.indexOf(name) === -1) seenClients.push(name);

          return self.getClient(c[1], c[0], index === 0);
        });

        for (var j = start; j <= end; j++) {
          self.slots[j] = clients;
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

      if (!self.ready) {
        self.ready = true;
        self.emit('ready');
      }

      if (!self.fullReady) {
        var ready = 0;
        for (var i = 0; i < seenClients.length; i++) {
          var c = self.connections[seenClients[i]];
          if (c.ready) {
            if (++ready === seenClients.length) {
              self.fullReady = true;
              self.emit('fullReady');
            }
            continue;
          }
          c.once('ready', function() {
            if (++ready === seenClients.length) {
              self.fullReady = true;
              self.emit('fullReady');
            }
          });
        }
      }

      runCbs(null, self.slots);
    });
  };

  self.waitFor('connect', self.connected, tryClient);
};

/**
 * Select a Redis client for the given key and conf
 * @date   2015-11-23
 * @param  {string}   key  The Redis key (can also be an Array or Buffer)
 * @param  {object}   conf Configuration relating to the command (e.g. if it's readOnly)
 * @return {Redis}         A Redis client
 */
RedisClustr.prototype.selectClient = function(key, conf) {
  var self = this;

  // this command doesnt have keys, return any connection
  // NOTE: this means slaves may be used for no key commands regardless of slave config
  if (conf.keyless) return self.getRandomConnection();

  if (Array.isArray(key)) key = key[0];
  if (Buffer.isBuffer(key)) key = key.toString();

  var slot = calculateSlot(key);
  var clients = self.slots[slot];

  // if we haven't got config for this slot, try any connection
  if (!clients || !clients.length) return self.getRandomConnection();

  var index = 0;

  // always, never, share
  if (conf.readOnly && self.config.slaves && self.config.slaves !== 'never' && clients.length > 1) {
    // always use a slave for read commands
    if (self.config.slaves === 'always') {
      index = Math.floor(Math.random() * (clients.length - 1)) + 1;
    }
    // share read commands across master + slaves
    if (self.config.slaves === 'share') {
      index = Math.floor(Math.random() * clients.length);
    }
  }

  var cli = clients[index];
  if (index === 0 && cli.readOnly) {
    cli.send_command('readwrite', []);
    cli.readOnly = false;
  }
  if (index > 0 && !cli.readOnly) {
    cli.send_command('readonly', []);
    cli.readOnly = true;
  }

  return cli;
};

/**
 * Take arguments and convert them to an array of Redis command args and a callback
 * @date   2015-11-23
 * @param  {array}   args   Arguments which can be in a few different formats
 * @param  {Function} [cb]  Callback function so we can wait for the slot allocation
 * @return {array}          The parsed arguments and the callback function
 */
RedisClustr.prototype.parseArgs = function(args, cb) {
  var self = this;

  var commandCB = function(err) {
    if (err) self.emit('error', err);
  };

  var argsCb = typeof args[args.length - 1] === 'function';
  if (argsCb) {
    commandCB = args[args.length - 1];
  }

  if (!self.slots.length && cb) {
    self.getSlots(function(err) {
      if (err) return commandCB(err);
      self.parseArgs(args, cb);
    });
    return;
  }

  // now take cb off args so we can attach our own callback wrapper
  if (argsCb) args = args.slice(0, -1);

  if (Array.isArray(args[0])) {
    args = args[0];
  }

  if (cb) cb(null, args, commandCB);
  return [ args, commandCB ];
};

/**
 * Handle Redis commands
 * @date   2013-11-23
 * @param  {string}   cmd  The Redis command (e.g. set)
 * @param  {object}   conf Configuration related to this command (e.g. whether the key is readOnly)
 * @param  {array}    args Arguments to be passed to the command (including commandCallback)
 */
RedisClustr.prototype.doCommand = function(cmd, conf, args) {
  var self = this;

  self.parseArgs(args, function(_, args, cb) {
    var key = args[0];

    if (!key && !conf.keyless) return cb(new Error('no key for command: ' + cmd));

    var r = self.selectClient(key, conf);
    if (!r) return cb(new Error('couldn\'t get client'));
    if (!r[cmd]) return cb(new Error('NodeRedis doesn\'t know the ' + cmd + ' command'));
    self.commandCallback(r, cmd, args, cb);
    r[cmd].apply(r, args);
  });
};

/**
 * Handle Redis commands that may contain multiple keys (and therefore need splitting across slots)
 * @date   2013-11-23
 * @param  {string}   cmd  The Redis command (e.g. mset)
 * @param  {object}   conf Configuration related to this command (e.g. the key interval)
 * @param  {array}    args Arguments to be passed to the command (including commandCallback)
 */
RedisClustr.prototype.doMultiKeyCommand = function(cmd, conf, origArgs) {
  var self = this;

  self.parseArgs(origArgs, function(_, args, cb) {

    // already split into an individual command
    if (args.length === conf.interval) {
      return self.doCommand(cmd, conf, origArgs);
    }

    // batch the multi-key command into individual ones
    var b = self.batch();
    for (var i = 0; i < args.length; i += conf.interval) {
      b[cmd].apply(b, args.slice(i, i + conf.interval));
    }

    b.exec(function(err, resp) {
      if (resp) resp = conf.group(resp);
      cb(err, resp);
    });
  });
};

/**
 * Adds a custom callback to command args so cluster errors can be properly handled
 * @date   2015-11-14
 * @param  {Redis}    cli  A Redis client
 * @param  {string}   cmd  The Redis command (e.g. get)
 * @param  {array}    args Arguments to be passed to the command (and to have our callback added to)
 * @param  {Function} cb   The main callback to wrap around
 */
RedisClustr.prototype.commandCallback = function(cli, cmd, args, cb) {
  var self = this;

  // number of attempts/redirects when we get connection errors
  // or when we get MOVED/ASK responses
  // https://github.com/antirez/redis-rb-cluster/blob/fd931ed34dfc53159e2f52c9ea2d4a5073faabeb/cluster.rb#L29
  var retries = 16;

  args.push(function(err, resp) {
    if (err && err.message && retries--) {
      var msg = err.message;
      var ask = msg.substr(0, 4) === 'ASK ';
      var moved = !ask && msg.substr(0, 6) === 'MOVED ';

      if (moved || ask) {
        // key has been moved!
        // lets refetch slots from redis to get an up to date allocation
        if (moved) self.getSlots();

        // REQUERY THE NEW ONE (we've got the correct details)
        var addr = err.message.split(' ')[2];
        var saddr = addr.split(':');
        var c = self.getClient(saddr[1], saddr[0], true);
        if (ask) c.send_command('asking', []);
        c[cmd].apply(c, args);
        return;
      }

      if (msg.substr(0, 8) === 'TRYAGAIN' || err.code === 'CLUSTERDOWN') {
        // TRYAGAIN response or cluster down, retry with backoff up to 1280ms
        setTimeout(function() {
          cli[cmd].apply(cli, args);
        }, Math.pow(2, 16 - Math.max(retries, 9)) * 10);
        return;
      }
    }

    cb(err, resp);
  });
};

/**
 * Run a command on all master nodes
 * @date   2015-11-23
 * @param  {string}   cmd  The Redis command (e.g. script)
 * @param  {array}   args Arguments to be passed to the command
 * @param  {Function} cb
 * @example
 * redis.onMasters('script', [ 'load', 'return redis.call("get", "a-key")' ], function(err) {});
 */
RedisClustr.prototype.onMasters = function(cmd, args, cb) {
  var self = this;

  if (!self.slots.length) {
    self.getSlots(function(err) {
      if (err) return cb(err);
      self.onMasters(cmd, args, cb);
    });
    return;
  }

  var todo = 0;
  var errs = null;
  var fullResp = [];
  var isDone = function(err, resp) {
    if (err) {
      if (!errs) errs = [];
      errs.push(err);
    }
    fullResp.push(resp);

    if (!--todo) {
      for (var i = 1; i < fullResp.length; i++) {
        // if we've got different responses, callback with the full array
        if (fullResp[i] !== fullResp[0]) return cb(errs, fullResp);
      }
      // callback with the first response if they're all the same
      cb(errs, fullResp[0]);
    }
  };

  for (var i in self.connections) {
    var cli = self.connections[i];
    if (!cli || !cli.master) continue;
    todo++;
    cli.send_command(cmd, args, isDone);
  }
};

/**
 * Wait for an event, or call back immediately if it's already been fired
 * @date   2015-11-23
 * @param  {string}   evt     The event to wait for
 * @param  {boolean}  [already=self[evt]] The property that indicates if the event has already been fired
 * @param  {Function} cb
 * @example
 * redis.waitFor('ready', function(err) { });
 * @example
 * redis.waitFor('connect', redis.connected, function(err) {}) ;
 */
RedisClustr.prototype.waitFor = function(evt, already, cb) {
  var self = this;

  if (!cb && typeof already === 'function') {
    cb = already;
    already = self[evt];
  }

  if (self.quitting) return cb(new Error('cluster is quitting'));
  if (already) return cb();

  var waitTimeout;

  var done = function() {
    if (waitTimeout) clearTimeout(waitTimeout);
    cb();
  };

  self.once(evt, done);

  // don't set a timeout (wait indefinitely for connection)
  if (!self.config.wait) return;

  waitTimeout = setTimeout(function() {
    self.removeListener(evt, done);
    cb(new Error('ready timeout reached'));
  }, self.config.wait);
};

/**
 * Create/recreate a subscription client and resubscribe to all pub/sub channels
 * @date   2015-11-23
 * @return {Redis}   A Redis client which can be used to subscribe
 */
RedisClustr.prototype.subscribeAll = function(exclude) {
  var self = this;
  if (self.quitting) return;

  if (self.subscribeClient) {
    self.subscribeClient.removeAllListeners();
    self.subscribeClient.quit(function() {
      // ignore errors
    });
    self.subscribeClient = null;
  }

  var con = self.getRandomConnection(exclude);
  if (!con) {
    if (!self.ready) self.wait('ready', self.subscribeAll.bind(self, exclude));
    return false;
  }

  // duplicate the random connection and make that our subscriber client
  var cli = self.subscribeClient = self.createClient(con.connection_options.port, con.connection_options.host);

  cli.on('error', function(err) {
    console.log(err);
    if (
      err.code === 'CONNECTION_BROKEN' ||
      err.code === 'UNCERTAIN_STATE' ||
      /Redis connection to .* failed.*/.test(err.message)
    ) {
      self.emit('connectionError', err, cli);
      // immediately try to re-subscribe
      self.subscribeAll([ cli.address ]);
      return;
    }

    // re-emit the error ourselves
    self.emit('error', err, cli);
  });

  cli.once('end', function() {
    self.subscribeAll([ cli.address ]);
  });

  // bubble all messages for pubsub
  var events = [
    'message',
    'pmessage',
    'subscribe',
    'unsubscribe',
    'psubscribe',
    'punsubscribe'
  ];
  events.forEach(function(evt) {
    cli.on(evt, function(a, b, c) {
      self.emit(evt, a, b, c);
    });
  });

  if (self.subscriptions) {
    for (var cmd in self.subscriptions) {
      cli[cmd](Object.keys(self.subscriptions[cmd]));
    }
  }

  return cli;
};

setupCommands(RedisClustr);

/**
 * Start a new batch/group of pipelined commands
 * @date   2014-11-19
 * @return {RedisBatch}   A RedisBatch which has a very similar interface                                                 to redis/
 */
RedisClustr.prototype.batch = RedisClustr.prototype.multi = function() {
  var self = this;
  return new RedisBatch(self);
};

/**
 * Run script commands on all master connections (especially for script load etc)
 * @date   2015-11-23
 */
RedisClustr.prototype.script = function() {
  var self = this;
  var args = new Array(arguments.length);
  for (var i = 0; i < arguments.length; i++) {
    args[i] = arguments[i];
  }

  self.parseArgs(args, function(_, args, cb) {
    self.onMasters('script', args, cb);
  });
};

/**
 * Custom handling for eval and evalsha to try to select the
 * correct node based on the given keys
 * @date    2015-11-23
 * @param   {string}   cmd  The Redis command - eval or evalsha
 * @param   {array}   args Arguments to be passed to the command
 * @private
 */
RedisClustr.prototype._eval = function(cmd, args) {
  var self = this;

  self.parseArgs(args, function(_, args, cb) {
    var numKeys = args[1];
    var r;
    if (!numKeys) {
      r = self.getRandomConnection();
    } else {
      // select based on the first KEYS argument
      // we *could* validate that all keys are together, but it's easier
      // to allow redis to error instead
      r = self.selectClient(args[2], {});
    }

    self.commandCallback(r, cmd, args, cb);

    r[cmd].apply(r, args);
  });
};

var overwriteFn = function(handler, fn) {
  return function() {
    var args = new Array(arguments.length);
    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i];
    }
    this[handler](fn, args);
    return this;
  };
};

RedisClustr.prototype.eval = overwriteFn('_eval', 'eval');
RedisClustr.prototype.evalsha = overwriteFn('_eval', 'evalsha');

/**
 * Handle subscription commands, creating sub client if necessary and remembers what channels
 * we're currently subscribed to
 * @date    2015-11-23
 * @param   {string}   cmd  The subscription command (subscribe, unsubscribe...)
 * @param   {array}   args  Arguments to be passed to the command (list of channels) (including commandCallback)
 * @private
 */
RedisClustr.prototype._subscribe = function(cmd, args) {
  var self = this;

  self.parseArgs(args, function(_, args, cb) {
    var cli = self.subscribeClient;
    if (!cli) cli = self.subscribeAll();
    if (!cli) return cb(new Error('couldn\'t get subscriber client'));

    var del = cmd === 'unsubscribe' || cmd === 'punsubscribe';
    var key = cmd;
    if (key === 'unsubscribe') key = 'subscribe';
    if (key === 'punsubscribe') key = 'psubscribe';

    if (!self.subscriptions) self.subscriptions = {};
    if (!self.subscriptions[key]) self.subscriptions[key] = {};

    // kill all subscriptions
    if (del && !args.length) {
      self.subscriptions[key] = {};
      cli[cmd](cb);
      return;
    }

    for (var i = 0; i < args.length; i++) {
      if (del) {
        delete self.subscriptions[key][args[i]];
      } else {
        self.subscriptions[key][args[i]] = true;
      }
    }

    cli[cmd](args, cb);
  });
};

RedisClustr.prototype.subscribe = overwriteFn('_subscribe', 'subscribe');
RedisClustr.prototype.psubscribe = overwriteFn('_subscribe', 'psubscribe');
RedisClustr.prototype.unsubscribe = overwriteFn('_subscribe', 'unsubscribe');
RedisClustr.prototype.punsubscribe = overwriteFn('_subscribe', 'punsubscribe');

/**
 * Quit the Redis cluster, closing all underlying connections
 * @date   2014-07-29
 * @param  {Function} cb
 */
RedisClustr.prototype.quit = function(cb) {
  var self = this;
  self.quitting = true;

  if (self._slotInterval) clearInterval(self._slotInterval);

  var todo = 0;
  var errs = null;
  var quitCb = function(err) {
    if (err && !errs) errs = [];
    if (err) errs.push(err);
    if (!--todo && cb) cb(errs);
  };

  for (var i in self.connections) {
    if (!self.connections[i]) continue;
    todo++;
    self.connections[i].quit(quitCb);
  }

  if (self.subscribeClient) {
    todo++;
    self.subscribeClient.quit(quitCb);
  }
};
