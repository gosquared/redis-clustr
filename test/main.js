// not really tests but being used to ensure things are working

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
    }
  ]
});

c.set('hi', 1);

c.get('hi', function(err, res) {
  console.log(arguments);
});


c.set('hi', 500);


var m = c.multi();
m.set('hi', 600);
m.set('hello', 650);

m.get('hello', function() {

});

m.get('hi', function() {

});

m.del('hi','hello','one','two', function() {
  console.log('multidel in multi',arguments);
});

m.get('hello', function() {
  console.log(arguments[1]);
})

m.exec(function(err, res) {
  console.log('multi complete', res);
});


c.del(['hi','hello','oi','wtf'], function() {
  console.log("multi del", arguments);
});
