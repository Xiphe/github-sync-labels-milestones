'use strict';

var Q = require('q');
var _ = require('lodash');
var getExisting = require('./getExisting');
var CONSTANTS = require('./constants');

module.exports = function(options) {
  var github = options.github;
  var labels = options.labels;
  var user = options.user;
  var repo = options.repo;

  function withAssignment(args) {
    args.user = user;
    args.repo = repo;

    return args;
  }

  function getAllLabels(page, prevLabels) {
    if (!page) {
      page = 1;
    }
    if (!prevLabels) {
      prevLabels = [];
    }

    return Q.nfcall(
      github.issues.getLabels,
      withAssignment({
        page: page,
        'per_page': CONSTANTS.LABELS_PER_PAGE
      })
    ).then(function(labels) {
      var allLabels = prevLabels.concat(labels);
      if (labels.length === CONSTANTS.LABELS_PER_PAGE) {
        return getAllLabels(page + 1, allLabels);
      } else {
        return allLabels;
      }
    });
  }

  function log(state, title) {
    options.log({
      state: state,
      title: title,
      type: CONSTANTS.TYPE_LABEL,
      repo: repo,
      user: user
    });
  }

  log.verbose = function() {
    if (_.isFunction(options.log.verbose)) {
      options.log.verbose.apply(options.log.verbose, arguments);
    }
  };

  function getAllRepoIssues(label, page, prevIssues) {
    if (!page) {
      page = 1;
    }
    if (!prevIssues) {
      prevIssues = [];
    }

    return Q.nfcall(
      github.issues.getForRepo,
      withAssignment({
        labels: label,
        state: 'all',
        page: page,
        'per_page': CONSTANTS.ISSUES_PER_PAGE
      })
    ).then(function(issues) {
      var allIssues = prevIssues.concat(issues);

      if (issues.length === CONSTANTS.ISSUES_PER_PAGE) {
        return getAllRepoIssues(label, page + 1, allIssues);
      } else {
        return allIssues;
      }
    });
  }

  return getAllLabels().then(function(existingLabels) {
    var queue = [];

    labels.forEach(function(label) {
      var args = {
        name: label.name,
        color: label.color
      };

      var possibleNames = [].concat(
        label.name,
        label.previousNames
      );

      var existingLabel = getExisting(
        existingLabels,
        possibleNames,
        'name'
      );

      if (existingLabel.length > 1) {
        throw new Error('multiple labels found for ' + possibleNames +
          ' in ' + user + '/' + repo + ' can not rename');
      } else {
        existingLabel = existingLabel[0];
      }

      if (label.state === 'absent') {
        if (existingLabel) {
          queue.push(Q.nfcall(
            github.issues.deleteLabel,
            withAssignment(args)
          ).then(function() {
            log(CONSTANTS.LOG_TYPE_DELETE, args.name);
          }));
        } else {
          log(CONSTANTS.LOG_TYPE_OK, args.name);
        }
      } else {
        var promise = Q.when(args);

        if (existingLabel) {
          var update = false;
          _.forEach(args, function(value, key) {
            if (!update && existingLabel[key] !== value) {
              update = true;
            }
          });


          if (update) {
            promise = promise.then(function() {
              return Q.nfcall(
                github.issues.updateLabel,
                withAssignment(Object.assign({}, args, {
                  oldname: existingLabel.name
                }))
              ).then(function(label) {
                log(CONSTANTS.LOG_TYPE_UPDATE, args.name);
                return label;
              });
            });
          } else {
            log(CONSTANTS.LOG_TYPE_OK, args.name);
            promise = promise.then(function() {
              return existingLabel;
            });
          }
        } else {
          promise = promise.then(function() {
            return Q.nfcall(
              github.issues.createLabel,
              withAssignment(args)
            ).then(function(label) {
              log(CONSTANTS.LOG_TYPE_CREATE, args.name);
              return label;
            });
          });
        }

        queue.push(promise);
      }
    });

    return Q.all(queue);
  });
};
