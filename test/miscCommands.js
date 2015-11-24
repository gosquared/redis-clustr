'use strict';
// not really tests but being used to ensure things are working
var RedisClustr = require('../src/redisClustr');

var c = new RedisClustr({
  servers: [
    {
      port: 7006,
      host: 'localhost'
    }
  ]
});

c.set('hi', 1);

c.get('hi', function(err, res) {
  console.log(arguments);
});


c.set('hi', 500);

c.zadd(['key2', 1, 'a'], function() { console.log('nomulti zadd', arguments); });

c.del(['hi','hello','oi','wtf'], function() {
  console.log("multi del", arguments);
});

c.set('hi', 650);

c.eval('redis.call("set", KEYS[1], ARGV[1]); return redis.call("get", KEYS[1]);', 1, 'evalkey', 'evalval', function(err, resp) {
  console.log('eval', err, resp);
});

var todo = [
  function(done) {
    var m = c.multi();
    m.set('hi', 600);
    m.set('hello', 650);

    m.get('hello', function() {

    });

    m.get('hi', function() {

    });

    m.del('hello','one','two', function() {
      console.log('multidel in multi',arguments);
    });

    m.get('hello', function() {
      console.log(arguments[1]);
    });

    m.zadd(['key', 1, 'a', 2, 'b'], function(){ console.log('multizadd', arguments); });

    m.exec(function(err, res) {
      console.log('multi complete', res);
      done();
    });
  },
  function(done) {
    var b = c.batch();

    b.get('hi', function() {
      console.log('batch get', arguments[1]);
    });

    b.set('hi', 1, function() {
      console.log('batch set', arguments);
    });

    b.get('hi', function() {
      console.log('batch get (already set)', arguments[1]);
    });

    b.zadd(['key', 1, 'a', 2, 'b'], function(){ console.log('batchzadd', arguments); });

    b.mget([ 'hi', 'hello', 'oi', 'wtf', 'key'], function() {
      console.log('batch mget', arguments);
    });

    b.eval('redis.call("set", KEYS[1], ARGV[1]); return redis.call("get", KEYS[1]);', 1, 'evalkey', 'evalval', function(err, resp) {
      console.log('batch eval', err, resp);
    });

    b.del(['hi','hello','oi','wtf','key','evalkey'], function() {
      console.log("batch del", arguments);
    });

    b.exec(function(err, res) {
      console.log('batch complete', res);
      done();
    });
  }
];

var ind = 0;
var cb = function() {
  if (todo[++ind]) return todo[ind](cb);
  c.quit(function() {
    console.log('QUIT');
  });
};
todo[ind](cb);
