// Extra config for certain commands

module.exports = {
  mget: {
    group: function(resp) {
      return resp.map(function(r) {
        if (!r) return r;
        return r[0];
      });
    }
  },
  mset: {
    group: function() {
      return 'OK';
    }
  },
  del: {
    group: function(resp) {
      var total = 0;
      for (var i = 0; i < resp.length; i++) {
        total += (resp[i] || 0);
      }
      return total;
    }
  }
};
