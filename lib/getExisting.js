'use strict';

var _ = require('lodash');

module.exports = function getExisting(existing, posibleValues, by) {
  var found = [];

  posibleValues.forEach(function (value) {
    if (!value) {
      return;
    }

    var query = {};
    query[by] = value;
    found.push(_.find(existing, query));
  });
  found = found.filter(function (ms) {
    return !!ms;
  });

  return found;
};
