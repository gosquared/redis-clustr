var Benchmark = require('benchmark');
var RedisClustr = require('./../src/RedisClustr');
var largeStr = (new Array(4096 + 1).join('-'));
var hugeStr = (new Array((4 * 1024 * 1024) + 1).join('-'));
console.log('\r\n');
require('./print');
console.log('\r\n');

var suite = new Benchmark.Suite();

var redis = new RedisClustr({
    servers: [
        {
            host: '127.0.0.1',
            port: 7006
        }
    ]
});


redis.once('connect', () => {
    suite.run();
});

redis.once('error', (err) => {
    console.error(err);
});

suite
    .add('PING', {
        defer: true,
        fn: function (deferred) {
            redis.ping(() => deferred.resolve());
        }
    })

    .add('INCR', {
        defer: true,
        fn: function (deferred) {
            redis.incr('incrtest', () => deferred.resolve());
        }
    })

    .add('SET 4B str', {
        defer: true,
        fn: function (deferred) {
            redis.set('moo', '1234', () => deferred.resolve());
        }
    })

    .add('GET 4B str', {
        defer: true,
        fn: function (deferred) {
            redis.get('moo', () => deferred.resolve());
        }
    })

    .add('SET 4KB str', {
        defer: true,
        fn: function (deferred) {
            redis.set('moobar', largeStr, () => deferred.resolve());
        }
    })

    .add('GET 4KB str', {
        defer: true,
        fn: function (deferred) {
            redis.get('moobar', () => deferred.resolve());
        }
    })

    .add('SET 4MB str', {
        defer: true,
        fn: function (deferred) {
            redis.set('moobarhuge', hugeStr, () => deferred.resolve());
        }
    })

    .add('GET 4MB str', {
        defer: true,
        fn: function (deferred) {
            redis.get('moobarhuge', () => deferred.resolve());
        }
    })

    .on('complete', function () {
        redis.quit();
    })

    .on('cycle', function (e) {
        console.log('' + e.target);
    });
