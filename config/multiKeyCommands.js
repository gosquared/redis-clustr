// Commands that can contain multiple different keys need to be handled specially
module.exports = {
  mget: {
    interval: 1,
    group: function(resp) {
      return resp.map(function(r) {
        if (!r) return r;
        return r[0];
      });
    }
  },
  mset: {
    interval: 2,
    group: function() {
      return 'OK';
    }
  },
  del: {
    interval: 1,
    group: function(resp) {
      var total = 0;
      for (var i = 0; i < resp.length; i++) {
        total += (resp[i] || 0);
      }
      return total;
    }
  }
};
