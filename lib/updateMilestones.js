// @ts-nocheck

'use strict';

var Q = require('q');
var _ = require('lodash');
var getExisting = require('./getExisting');
var CONSTANTS = require('./constants');

module.exports = function (options) {
  var github = options.github;
  var milestones = options.milestones;
  var user = options.user;
  var repo = options.repo;

  function withAssignment(args) {
    args.owner = user;
    args.repo = repo;

    return args;
  }

  function getAllMilestones(page, prevMilestones) {
    if (!page) {
      page = 1;
    }
    if (!prevMilestones) {
      prevMilestones = [];
    }

    return github.rest.issues
      .listMilestones(
        withAssignment({
          page: page,
          state: 'all',
          per_page: CONSTANTS.MILESTONES_PER_PAGE,
        }),
      )
      .then(function (res) {
        var allMilestones = prevMilestones.concat(res.data);
        if (res.data.length === CONSTANTS.MILESTONES_PER_PAGE) {
          return getAllMilestones(state, page + 1, allMilestones);
        } else {
          return allMilestones;
        }
      });
  }

  function log(state, title) {
    options.log({
      state: state,
      title: title,
      type: CONSTANTS.TYPE_MILESTONE,
      repo: repo,
      user: user,
    });
  }

  return getAllMilestones().then(function (existingMilestones) {
    var queue = [];

    milestones.forEach(function (milestone) {
      var args = {
        title: milestone.title,
      };

      ['state', 'description', 'due_on'].forEach(function (optional) {
        if (milestone[optional]) {
          args[optional] = milestone[optional];
        }
      });

      var possibleTitles = [].concat(milestone.title, milestone.previousTitles);

      var existingMilestone = getExisting(
        existingMilestones,
        possibleTitles,
        'title',
      );

      if (existingMilestone.length > 1) {
        throw new Error(
          'multiple milestones found for ' +
            possibleTitles +
            ' in ' +
            user +
            '/' +
            repo +
            ' can not rename',
        );
      } else {
        existingMilestone = existingMilestone[0];
      }

      if (existingMilestone) {
        args.milestone_number = existingMilestone.number;
      }

      if (milestone.state === 'absent') {
        if (existingMilestone) {
          queue.push(
            github.rest.issues
              .deleteMilestone(
                withAssignment({ milestone_number: args.milestone_number }),
              )
              .then(function () {
                log(CONSTANTS.LOG_TYPE_DELETE, args.title);
              }),
          );
        } else {
          log(CONSTANTS.LOG_TYPE_OK, args.title);
        }
      } else {
        if (!existingMilestone) {
          queue.push(
            github.rest.issues
              .createMilestone(withAssignment(args))
              .then(function () {
                log(CONSTANTS.LOG_TYPE_CREATE, args.title);
              }),
          );
        } else {
          var update =
            args.title != existingMilestone.title ||
            args.state != existingMilestone.state ||
            args.description != existingMilestone.description ||
            (args.due_on || '').split('T')[0] !=
              (existingMilestone.due_on || '').split('T')[0];

          if (update) {
            queue.push(
              github.rest.issues
                .updateMilestone(withAssignment(args))
                .then(function () {
                  log(CONSTANTS.LOG_TYPE_UPDATE, args.title);
                }),
            );
          } else {
            log(CONSTANTS.LOG_TYPE_OK, args.title);
          }
        }
      }
    });

    return Q.all(queue);
  });
};
