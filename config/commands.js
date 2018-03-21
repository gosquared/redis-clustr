// Generated using tools/commands.js and config/commandsConfig.js on Wed, 21 Mar 2018 11:49:17 GMT

module.exports = {
  append: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  asking: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  auth: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  bgrewriteaof: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  bgsave: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  bitcount: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  bitop: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  bitpos: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  blpop: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  brpop: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  brpoplpush: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  client: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  cluster: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  command: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  config: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  dbsize: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  debug: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  decr: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  decrby: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  del: {
    group: function(resp) {
      var total = 0;
      for (var i = 0; i < resp.length; i++) {
        total += (resp[i] || 0);
      }
      return total;
    },
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  discard: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  dump: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  echo: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  eval: {
    multiKey: false,
    interval: 0,
    keyless: false,
    readOnly: false
  },
  evalsha: {
    multiKey: false,
    interval: 0,
    keyless: false,
    readOnly: false
  },
  exec: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  exists: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  expire: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  expireat: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  flushall: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  flushdb: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  get: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  getbit: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  getrange: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  getset: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hdel: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hexists: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hget: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hgetall: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hincrby: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hincrbyfloat: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hkeys: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hlen: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hmget: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hmset: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hscan: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  hset: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hsetnx: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  hvals: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  incr: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  incrby: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  incrbyfloat: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  info: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  keys: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  lastsave: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  latency: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  lindex: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  linsert: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  llen: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  lpop: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  lpush: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  lpushx: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  lrange: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  lrem: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  lset: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  ltrim: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  mget: {
    group: function(resp) {
      return resp.map(function(r) {
        if (!r) return r;
        return r[0];
      });
    },
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  migrate: {
    multiKey: false,
    interval: 0,
    keyless: false,
    readOnly: false
  },
  monitor: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  move: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  mset: {
    group: function() {
      return 'OK';
    },
    multiKey: true,
    interval: 2,
    keyless: false,
    readOnly: false
  },
  msetnx: {
    multiKey: true,
    interval: 2,
    keyless: false,
    readOnly: false
  },
  multi: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  object: {
    multiKey: false,
    interval: 2,
    keyless: false,
    readOnly: true
  },
  persist: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  pexpire: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  pexpireat: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  pfadd: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  pfcount: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  pfdebug: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  pfmerge: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  pfselftest: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  ping: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  psetex: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  psubscribe: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  psync: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  pttl: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  publish: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  pubsub: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  punsubscribe: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  randomkey: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  readonly: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  readwrite: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  rename: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  renamenx: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  replconf: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  restore: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  'restore-asking': {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  role: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  rpop: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  rpoplpush: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  rpush: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  rpushx: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  sadd: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  save: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  scan: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  scard: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  script: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  sdiff: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  sdiffstore: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  select: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  set: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  setbit: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  setex: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  setnx: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  setrange: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  shutdown: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  sinter: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  sinterstore: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  sismember: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  slaveof: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: false
  },
  slowlog: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  smembers: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  smove: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  sort: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  spop: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  srandmember: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  srem: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  sscan: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  strlen: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  subscribe: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  substr: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  sunion: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  sunionstore: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  sync: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  time: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  ttl: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  type: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  unsubscribe: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  unwatch: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  wait: {
    multiKey: false,
    interval: 0,
    keyless: true,
    readOnly: true
  },
  watch: {
    multiKey: true,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zadd: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  zcard: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zcount: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zincrby: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  zinterstore: {
    multiKey: false,
    interval: 0,
    keyless: false,
    readOnly: false
  },
  zlexcount: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrange: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrangebylex: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrangebyscore: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrank: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrem: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  zremrangebylex: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  zremrangebyrank: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  zremrangebyscore: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: false
  },
  zrevrange: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrevrangebylex: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrevrangebyscore: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zrevrank: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zscan: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zscore: {
    multiKey: false,
    interval: 1,
    keyless: false,
    readOnly: true
  },
  zunionstore: {
    multiKey: false,
    interval: 0,
    keyless: false,
    readOnly: false
  }
};
