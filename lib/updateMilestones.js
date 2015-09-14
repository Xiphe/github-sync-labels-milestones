'use strict';

var Q = require('q');
var _ = require('lodash');
var getExisting = require('./getExisting');
var MILESTONES_PER_PAGE = 100;

module.exports = function(options) {
  var github = options.github;
  var milestones = options.milestones;
  var user = options.user;
  var log = options.log;
  var repo = options.repo;

  function withAssignment(args) {
    args.user = user;
    args.repo = repo;

    return args;
  }

  function getAllMilestones(state, page, prevMilestones) {
    if (!page) {
      page = 1;
    }
    if (!prevMilestones) {
      prevMilestones = [];
    }

    return Q.nfcall(
      github.issues.getAllMilestones,
      withAssignment({
        page: page,
        state: state,
        'per_page': MILESTONES_PER_PAGE
      })
    ).then(function(labels) {
      var allMilestones = prevMilestones.concat(labels);
      if (labels.length === MILESTONES_PER_PAGE) {
        return getAllMilestones(state, page + 1, allMilestones);
      } else {
        return allMilestones;
      }
    });
  }

  return Q.all([
    getAllMilestones('open'),
    getAllMilestones('closed')
  ]).spread(function(openMilestones, closedMilestones) {
    var existingMilestones = openMilestones.concat(closedMilestones);
    var queue = [];

    milestones.forEach(function(milestone) {
      var args = {
        title: milestone.title
      };

      ['state', 'description', 'due_on'].forEach(function(optional) {
        if (milestone[optional]) {
          args[optional] = milestone[optional];
        }
      });

      var possibleTitles = [].concat(
        milestone.title,
        milestone.previousTitles
      );

      var existingMilestone = getExisting(
        existingMilestones,
        possibleTitles,
        'title'
      );

      if (existingMilestone.length > 1) {
        throw new Error('multiple milestones found for ' + possibleTitles +
          ' in ' + user + '/' + repo + ' can not rename');
      } else {
        existingMilestone = existingMilestone[0];
      }

      if (existingMilestone) {
        args.number = existingMilestone.number;
      }

      if (milestone.state === 'absent') {
        if (existingMilestone) {
          queue.push(Q.nfcall(
            github.issues.deleteMilestone,
            withAssignment(args)
          ).then(function() {
            log.log('removed milestone:', args.title);
          }));
        } else {
          log.log('milestone ok:', args.title);
        }
      } else {
        if (!existingMilestone) {
          queue.push(Q.nfcall(
            github.issues.createMilestone,
            withAssignment(args)
          ).then(function() {
            log.log('created milestone:', args.title);
          }));
        } else {
          var update = false;
          _.forEach(args, function(value, key) {
            if (!update && existingMilestone[key] !== value) {
              update = true;
            }
          });

          if (update) {
            queue.push(Q.nfcall(
              github.issues.updateMilestone,
              withAssignment(args)
            ).then(function() {
              log.log('updated milestone:', args.title);
            }));
          } else {
            log.log('milestone ok:', args.title);
          }
        }
      }
    });

    return Q.all(queue);
  });

};
