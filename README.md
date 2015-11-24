# redis-clustr

[![Dependencies](https://david-dm.org/gosquared/redis-clustr.svg)](https://david-dm.org/gosquared/redis-clustr)
[![Join the chat at https://gitter.im/gosquared/redis-clustr](https://img.shields.io/badge/gitter-join%20chat-blue.svg)](https://gitter.im/gosquared/redis-clustr)

[![NPM](https://nodei.co/npm/redis-clustr.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/redis-clustr)

This module is a relatively thin wrapper around the node redis client to enable use of [Redis Cluster](http://redis.io/topics/cluster-spec). It tries to be as unobtrusive as possible - mimicing the behaviour of the [node_redis](https://github.com/mranney/node_redis) client.


## Usage


```javascript
var RedisClustr = require('redis-clustr');

var redis = new RedisClustr({
  servers: [
    {
      host: '127.0.0.1',
      port: 7000
    }
  ]
});

redis.set('key', 'value');
```

### Servers

Servers in the cluster will be automatically connected to (via the response of `cluster slots`). Of course, to allow discovery there must be at least one server specified in the configuration.

### Client creation

By default, clients will be created using `Redis.createClient(port, host)`. This can be overridden by providing a function which *must* return a [node_redis](https://github.com/mranney/node_redis) client. Clients are cached so only one connection will be made to each server.

```javascript
var RedisClustr = require('redis-clustr');
var RedisClient = require('redis');
var redis = new RedisClustr({
  servers: [...],
  createClient: function(port, host) {
    // this is the default behaviour
    return RedisClient.createClient(port, host);
  }
});
```

### Options

```javascript
var RedisClustr = require('redis-clustr');
var redis = new RedisClustr({
  servers: [...],
  slotInterval: 1000, // default: none. Interval to repeatedly re-fetch cluster slot configuration
  maxQueueLength: 100, // default: no limit. Maximum length of the getSlots queue (basically number of commands that can be queued whilst connecting to the cluster)
  queueShift: false, // default: true. Whether to shift the getSlots callback queue when it's at max length (error oldest callback), or to error on the new callback
  wait: 5000, // default: no timeout. Max time to wait to connect to cluster before sending an error to all getSlots callbacks
  slaves: 'share', // default: 'never'. How to direct readOnly commands: 'never' to use masters only, 'share' to distribute between masters and slaves or 'always' to  only use slaves (if available)
  createClient: function(port, host, options) {
    return require('redis').createClient(port, host, options);
  }, // default: redis.createClient. Function used to connect to redis, called with arguments above
  redisOptions: {
    // options passed to the node_redis client https://github.com/NodeRedis/node_redis#options-is-an-object-with-the-following-possible-properties
    retry_max_delay: 500
    // etc
  }
});
```


## Supported functionality

### Slot reallocation

Supported - when a response is given with a `MOVED` error, we will immediately re-issue the command on the other server and run another `cluster slots` to get the new slot allocations. `ASK` redirection is also supported - we wil re-issue the command without updating the slots. `TRYAGAIN` responses will be retried automatically.

### Multi / Exec (Batch)

Multi commands are *supported* but treated as a batch of commands (not an actual multi) and the response is recreated in the original order. Commands are grouped by node and sent as [node_redis batches](https://github.com/NodeRedis/node_redis#clientbatchcommands)

### Multi-key commands (`del`, `mget` and `mset`)

Multi-key commands are also supported and will be split into individual commands (using a batch) then have the response recreated. Only `del`, `mget` and `mset` are supported at the moment.

### Pub/Sub

Pub/Sub is fully supported. When subscribe is used, a new client will be created (connected to a random node). This client is shared for all subscriptions.

```javascript
var RedisClustr = require('redis-clustr');
var redis = new RedisClustr({...});

redis.on('message', function(channel, message) { /* ... */ });

redis.subscribe('my-channel', function(err) {
  redis.publish('my-channel', 'have a lovely day!');
});
```

### Errors

Just like node_redis, listen to the `error` event to stop your application from crashing due to errors. Redis Clustr automatically intercepts connection errors and will try to reconnect to the server.
