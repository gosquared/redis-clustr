var RedisClustr = require('../index');

var c = new RedisClustr({
  clients: [
    {
      port: 6380,
      host: 'localhost'
    },
    {
      port: 6381,
      host: 'localhost'
    },
    {
      port: 6382,
      host: 'localhost'
    },
    {
      port: 6383,
      host: 'localhost'
    },
    {
      port: 6384,
      host: 'localhost'
    },
    {
      port: 6385,
      host: 'localhost'
    }
  ]
});

for (var i = 0; i < 1000000; i++) {
  c.set(i.toString(), '1', 'EX', 1);
}
