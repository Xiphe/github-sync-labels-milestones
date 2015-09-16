'use strict';

var GitHubApi = require('github');
var Q = require('q');

function validateOptions(options) {
  if (!options || !options.token) {
    throw new Error('github token required');
  }
}

function getGitHub(token) {
  var github = new GitHubApi({
    version: '3.0.0',
    headers: {
      'user-agent': 'Jimdo/github-sync-labels-milestones'
    }
  });

  github.authenticate({
    type: 'oauth',
    token: token
  });

  return github;
}

function validateInstruction(rules) {
  [
    {
      name: 'milestone',
      key: 'milestones',
      title: 'title',
      previousTitles: 'previousTitles'
    },
    {
      name: 'label',
      key: 'labels',
      title: 'name',
      previousTitles: 'previousNames'
    },
  ].forEach(function(opts) {
    rules[opts.key].forEach(function(rule, i) {
      if (rule[opts.previousTitles]) {
        rule[opts.previousTitles].forEach(function(previousTitle) {
          rules[opts.key].forEach(function(inst, ii) {
            if (previousTitle === inst[opts.title]) {
              throw new Error('Can not rename ' + opts.name +
                ' "' + previousTitle + '" to "' + rule[opts.title] +
                '" since there is still a main definition "' +
                previousTitle + '"'
              );
            } else if (
              i !== ii && inst[opts.previousTitles] &&
              inst[opts.previousTitles].indexOf(previousTitle) !== -1
            ) {
              throw new Error('Can not rename ' + opts.name +
                ' "' + previousTitle + '" since "' + rule[opts.title] + '" and "' +
                inst[opts.title] + '" both claim to be the new ' + opts.name
              );
            } else if (i !== ii && rule[opts.title] === inst[opts.title]) {
              throw new Error('Multiple ' + opts.name + 's with ' + opts.title +
                ' "' + inst[opts.title] + '"');
            }
          });
        });
      }
    });
  });
}

module.exports = function sync(options, instructions) {
  validateOptions(options);

  var github = getGitHub(options.token);
  var queue = [];

  instructions.forEach(function(instruction) {
    validateInstruction(instruction);
    instruction.repositories.forEach(function(repository) {
      var user = repository.split('/')[0];
      var repo = repository.split('/')[1];

      if (instruction.milestones.length) {
        queue.push(require('./updateMilestones')({
          github: github,
          user: user,
          repo: repo,
          log: options.log,
          milestones: instruction.milestones
        }));
      }

      if (instruction.labels.length) {
        queue.push(require('./updateLabels')({
          github: github,
          user: user,
          repo: repo,
          log: options.log,
          labels: instruction.labels
        }));
      }
    });
  });

  return Q.all(queue);
};
