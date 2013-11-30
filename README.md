# redis-clustr

This module is a relatively thin wrapper around the node redis client to enable use of a CRC16-based redis hashring.

It tries to be as unobtrusive as possible - mimicing the behaviour of the core redis client. Multi commands are *supported* but not as complete transactions, instead the commands are split into a multi for each node in the cluster which is then executed in parallel and the response is recreated in the original order. Multi-key commands (such as del('hello', 'hello2') etc) are also supported and will be grouped into the relevant commands for each node.

## Usage

Unless slots are specified, each node will be allocated an equal section of slots (0 - 65535). The order of the clients is **essential** if no slots are specified.

### Basic

```javascript
var RedisCluster = require('redis-clustr');

var redis = new RedisCluster([
  {
    host: 'localhost',
    port: 6380
  },
  {
    host: 'localhost',
    port: 6381
  },
  {
    host: 'localhost',
    port: 6382
  }
]);

// lets start using the cluster!
redis.set('test', 'value');

var multi = redis.multi();

multi.get('test', function(err, res) {
  // null, 'value'
});

multi.set('test2', 'value2');

multi.del('test', 'test2', function(err) {
  // responses for multi key commands are *not* 100% reliable
});

multi.exec(function(err, res) {
  console.log(err, res);
});

```

### Advanced

Slot ranges can be manually specified, as can redis clients to use (`client` rather than `host` and `port`). Note: if a client is specified, a `name` **must** be specified.

```javascript
var RedisCluster = require('redis-clustr');
var Redis = require('redis');

var redis = new RedisCluster([
  {
    name: 'tiny-client'
    client: Redis.createClient(6380, 'localhost'),
    slots: [ 0, 100 ]
  },
  {
    name: 'little',
    client: Redis.createClient(6381, 'localhost'),
    slots: [ 101, 5000 ]
  },
  {
    name: 'huge-client',
    client: Redis.createClient(6382, 'localhost'),
    slots: [ 5001, 65535 ]
  }
]);

// etc etc

```
