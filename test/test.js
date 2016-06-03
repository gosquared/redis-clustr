'use strict';
var RedisClustr = require('../src/RedisClustr');
var assert = require('assert');
var commands = require('../config/commands');

var hosts = [
  {
    port: 7006,
    host: '127.0.0.1'
  }
];

describe('RedisClustr', function() {
  describe('connecting', function() {
    it('connects', function(done) {
      var r = new RedisClustr(hosts);
      r.once('connect', function() {
        var hasConnection = false;
        for (var i in r.connections) {
          if (r.connections[i].ready) hasConnection = true;
        }
        assert(hasConnection, 'Expected a connection to be ready');
        r.quit(done);
      });
    });

    it('becomes ready (fetches slots)', function(done) {
      var r = new RedisClustr(hosts);
      r.once('ready', function() {
        assert.strictEqual(r.slots.length, 16384, 'Expected slots.length to be 16364, got ' + r.slots.length);
        r.quit(done);
      });
    });

    it('becomes fullReady (all clients connected)', function(done) {
      var r = new RedisClustr(hosts);
      r.once('fullReady', function() {
        for (var i in r.connections) {
          if (!r.connections[i]) continue;
          assert(r.connections[i].ready, 'Expected all connections to be ready');
        }
        r.quit(done);
      });
    });
  });

  describe('disconnecting', function() {
    describe('quit', function() {
      it('works immediately', function(done) {
        var r = new RedisClustr(hosts);
        r.quit(done);
      });

      it('works after connect', function(done) {
        var r = new RedisClustr(hosts);
        r.once('connect', function() {
          r.quit(done);
        });
      });

      it('works after ready', function(done) {
        var r = new RedisClustr(hosts);
        r.once('ready', function() {
          r.quit(done);
        });
      });

      it('works after fullReady', function(done) {
        var r = new RedisClustr(hosts);
        r.once('fullReady', function() {
          r.quit(done);
        });
      });
    });

    it('emits end', function(done) {
      var r = new RedisClustr(hosts);
      r.once('end', function() {
        for (var i in r.connections) {
          if (!r.connections[i]) continue;
          assert(!r.connections[i].ready && !r.connections[i].connected, 'Expected no connections to be ready/connected');
        }
        done();
      });
      r.quit();
    });
  });

  describe('client selection', function() {
    var r = new RedisClustr(hosts);
    before(function(done) {
      r.waitFor('ready', done);
    });

    // very basic...
    it('returns clients', function() {
      assert(r.selectClient('key', commands.get));
    });
  });

  describe('Pub/Sub', function() {
    var r = new RedisClustr(hosts);

    it('subscribes', function(done) {
      r.once('subscribe', function(channel) {
        assert.strictEqual(channel, 'test', 'Expected channel to be test');
        done();
      });
      r.subscribe('test', function(err) {
        assert.ifError(err);
      });
    });

    it('unsubscribes', function(done) {
      r.once('unsubscribe', function(channel) {
        assert.strictEqual(channel, 'test', 'Expected channel to be test');
        done();
      });
      r.unsubscribe('test', function(err) {
        assert.ifError(err);
      });
    });

    it('psubscribes', function(done) {
      r.once('psubscribe', function(channel) {
        assert.strictEqual(channel, 'test*', 'Expected channel to be test*');
        done();
      });
      r.psubscribe('test*', function(err) {
        assert.ifError(err);
      });
    });

    it('punsubscribes', function(done) {
      r.once('punsubscribe', function(channel) {
        assert.strictEqual(channel, 'test*', 'Expected channel to be test*');
        done();
      });
      r.punsubscribe('test*', function(err) {
        assert.ifError(err);
      });
    });

    it('publishes messages', function(done) {
      r.once('message', function(channel, message) {
        assert.strictEqual(channel, 'messages', 'Expected channel to be messages');
        assert.strictEqual(message, 'my message');

        r.unsubscribe('messages', done);
      });
      r.subscribe('messages', function(err) {
        assert.ifError(err);
        r.publish('messages', 'my message');
      });
    });

    it.skip('handles client failure', function(done) {
      var r = new RedisClustr(hosts);
      r.on('error', function() {});
      r.once('pmessage', function(pattern, channel) {
        assert.strictEqual(channel, 'other');

        r.once('message', function(channel) {
          assert.strictEqual(channel, 'some');
          done();
        });
      });
      r.subscribe('some', 'channels', function(err) {
        assert.ifError(err);
        r.psubscribe('oth?r', 'p*tterns', function(err) {
          assert.ifError(err);
          assert(r.subscriptions.subscribe.some);
          assert(r.subscriptions.psubscribe['p*tterns']);

          r.publish('other', 'test', function() {
            var a = r.subscribeClient.address;
            r.subscribeClient.stream.emit('error', 'error');
            assert.notStrictEqual(a, r.subscribeClient.address, 'Expected connection to different address');
            r.subscribeClient.once('ready', function() {
              r.publish('some', 'stuff');
            });
          });


          // done();
        });
      });
    });
  });
});
