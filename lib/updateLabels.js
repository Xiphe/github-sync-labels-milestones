'use strict';

var Q = require('q');
var _ = require('lodash');
var getExisting = require('./getExisting');
var LABELS_PER_PAGE = 100;
var ISSUES_PER_PAGE = 100;

module.exports = function(options) {
  var github = options.github;
  var labels = options.labels;
  var user = options.user;
  var log = options.log;
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
        'per_page': LABELS_PER_PAGE
      })
    ).then(function(labels) {
      var allLabels = prevLabels.concat(labels);
      if (labels.length === LABELS_PER_PAGE) {
        return getAllLabels(page + 1, allLabels);
      } else {
        return allLabels;
      }
    });
  }

  function renameLabels(labelList, name) {
    var queue = [];

    labelList.forEach(function(renameLabel) {
      queue.push(
        getAllRepoIssues(renameLabel.name)
          .then(function(issues) {
            var issueQueue = [];

            issues.forEach(function(issue) {
              var labelList = [];
              _.forEach(issue.labels, function(issueLabel) {
                labelList.push(issueLabel.name);
              });

              if (labelList.indexOf(name) === -1) {
                labelList.push(name);
              }

              issueQueue.push(Q.nfcall(
                github.issues.edit,
                withAssignment({
                  number: issue.number,
                  labels: labelList
                })
              ));
            });

            return Q.all(issueQueue).then(function() {
              log.log('moved isses of label', renameLabel.name, 'to', name);
              return Q.nfcall(
                github.issues.deleteLabel,
                withAssignment({name: renameLabel.name})
              ).then(function() {
                log.log('removed label:', renameLabel.name);
              });
            });
          })
      );
    });

    return Q.all(queue);
  }

  function getAllRepoIssues(label, page, prevIssues) {
    if (!page) {
      page = 1;
    }
    if (!prevIssues) {
      prevIssues = [];
    }

    return Q.nfcall(
      github.issues.repoIssues,
      withAssignment({
        labels: label,
        state: 'all',
        page: page,
        'per_page': ISSUES_PER_PAGE
      })
    ).then(function(issues) {
      var allIssues = prevIssues.concat(issues);

      if (issues.length === ISSUES_PER_PAGE) {
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

      var existingLabel = getExisting(
        existingLabels,
        [label.name],
        'name'
      )[0];

      if (label.state === 'absent') {
        if (existingLabel) {
          queue.push(Q.nfcall(
            github.issues.deleteLabel,
            withAssignment(args)
          ).then(function() {
            log.log('removed label:', args.name);
          }));
        } else {
          log.log('label ok:', args.name);
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
                withAssignment(args)
              ).then(function(label) {
                log.log('updated label:', args.name);
                return label;
              });
            });
          } else {
            log.log('label ok:', args.name);
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
              log.log('created label:', args.name);
              return label;
            });
          });
        }

        queue.push(promise.then(function(newLabel) {
          return renameLabels(
            getExisting(
              existingLabels,
              [].concat(label.previousNames),
              'name'
            ),
            newLabel.name
          );
        }));
      }
    });

    return Q.all(queue);
  });
};
