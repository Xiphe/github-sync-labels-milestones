'use strict';

var Q = require('q');
var _ = require('lodash');
var getExisting = require('./getExisting');
var CONSTANTS = require('./constants');

module.exports = function (options) {
  var github = options.github;
  var labels = options.labels;
  var user = options.user;
  var repo = options.repo;

  function withAssignment(args) {
    args.owner = user;
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

    return github.rest.issues
      .listLabelsForRepo(
        withAssignment({
          page: page,
          per_page: CONSTANTS.LABELS_PER_PAGE,
        }),
      )
      .then(function (res) {
        var labels = res.data;
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
      user: user,
    });
  }

  log.verbose = function () {
    if (_.isFunction(options.log.verbose)) {
      options.log.verbose.apply(options.log.verbose, arguments);
    }
  };

  return getAllLabels().then(function (existingLabels) {
    var queue = [];

    labels.forEach(function (label) {
      var possibleNames = [].concat(label.name, label.previousNames);

      var existingLabel = getExisting(existingLabels, possibleNames, 'name');

      if (existingLabel.length > 1) {
        throw new Error(
          'multiple labels found for ' +
            possibleNames +
            ' in ' +
            user +
            '/' +
            repo +
            ' can not rename',
        );
      } else {
        existingLabel = existingLabel[0];
      }

      if (label.state === 'absent') {
        if (existingLabel) {
          queue.push(
            github.rest.issues
              .deleteLabel(withAssignment({ name: label.name }))
              .then(function () {
                log(CONSTANTS.LOG_TYPE_DELETE, label.name);
              }),
          );
        } else {
          log(CONSTANTS.LOG_TYPE_OK, label.name);
        }
      } else {
        var promise = Q.when();

        if (existingLabel) {
          var update =
            existingLabel.name != label.name ||
            existingLabel.color != (label.color || 'ededed') ||
            existingLabel.description != label.description;

          console.log({ update, existingLabel, label });

          if (update) {
            promise = promise.then(function () {
              return github.rest.issues
                .updateLabel(
                  withAssignment({
                    name: existingLabel.name,
                    new_name: label.name,
                    color: label.color,
                    description: label.description,
                  }),
                )

                .then(function (res) {
                  log(CONSTANTS.LOG_TYPE_UPDATE, label.name);
                  return label.data;
                });
            });
          } else {
            log(CONSTANTS.LOG_TYPE_OK, label.name);
            promise = promise.then(function () {
              return existingLabel;
            });
          }
        } else {
          promise = promise.then(function () {
            return github.rest.issues
              .createLabel(
                withAssignment({
                  name: label.name,
                  color: label.color,
                  description: label.description,
                }),
              )
              .then(function (res) {
                log(CONSTANTS.LOG_TYPE_CREATE, label.name);
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
