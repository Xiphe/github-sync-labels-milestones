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
      'user-agent': 'Jimdo-Github-Orchestrator'
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
      name: 'Milestone',
      key: 'milestones',
      title: 'title',
      previousTitles: 'previousTitles'
    },
    {
      name: 'Label',
      key: 'labels',
      title: 'name',
      previousTitles: 'previousNames'
    },
  ].forEach(function(opts) {
    rules[opts.key].forEach(function(rule) {
      if (rule[opts.previousTitles]) {
        rule[opts.previousTitles].forEach(function(previousTitle) {
          rules[opts.key].forEach(function(inst) {
            if (previousTitle === inst[opts.title]) {
              throw new Error('Can not rename ' + opts.name +
                ' ' + previousTitle + ' to ' + rule[opts.title] +
                ' since there is still a main definition "' +
                previousTitle + '"'
              );
            }
          });
        });
      }
    });
  });
}

module.exports = function orchestrateGithub(options, instructions) {
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
