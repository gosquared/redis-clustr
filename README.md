# redis-clustr

> Note: This module is in beta - please be careful!

This module is a relatively thin wrapper around the node redis client to enable use of [Redis Cluster](http://redis.io/topics/cluster-spec). It tries to be as unobtrusive as possible - mimicing the behaviour of the [node_redis](https://github.com/mranney/node_redis) client.


## Usage


```javascript
var RedisCluster = require('redis-clustr');

var redis = new RedisCluster({
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
var RedisCluster = require('redis-clustr');
var RedisClient = require('redis');
var redis = new RedisCluster({
  servers: [...],
  createClient: function(port, host) {
    // this is the default behaviour
    return RedisClient.createClient(port, host);
  }
});
```


## Supported functionality/limitations

### Slot reallocation

Supported - when a response is given with a `MOVED` error, we will immediately re-issue the command on the other server and run another `cluster slots` to get the new slot allocations. `ASK` redirection is currently ignored.

### Multi / Exec

Multi commands are *supported* but treated as a batch of commands (not an actual multi) and the response is recreated in the original order.

### Multi-key commands (`del`, `mget`)

Multi-key commands are also supported and will split into individual commands then have the response recreated as an array. This means that `del` will get a response of `[ 1, 1 ]`  when deleting two keys instead of `2`.
