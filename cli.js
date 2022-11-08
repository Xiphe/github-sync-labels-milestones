#!/usr/bin/env node
// @ts-nocheck

'use strict';

var argv = require('minimist')(process.argv.slice(2), {
  alias: {
    token: 't',
    config: 'c',
    help: 'h',
    verbose: 'v',
    version: 'V',
    silent: 's',
    'path-prefix': 'pathPrefix',
  },
});
var Chalk = require('chalk').Instance;
var Q = require('q');
var path = require('path');
var _ = require('lodash');
var CONSTANTS = require('./lib/constants');
var YAML = require('yamljs');

var chalk = new Chalk({ level: argv.color === false ? 0 : undefined });

function wrt(str) {
  if (!argv.silent) {
    process.stdout.write(str, 'utf-8');
  }
}

if (argv.version) {
  wrt(require('./package').version + '\n');
  return;
}

if (argv.help) {
  wrt(
    [
      '',
      'Usage:',
      '',
      '  ' + chalk.cyan('github-sync-labels-milestones') + ' <options>',
      '',
      'Options:',
      '',
      '  ' +
        chalk.yellow('-t, --token') +
        '      [required] github personal access token',
      '  ' +
        chalk.yellow('-c, --config') +
        '     [required] path to config file',
      '  ' + chalk.yellow('-V, --verbose') + '    make output more verbose',
      '  ' + chalk.yellow('-s, --silent') + '     oppress output',
      '  ' + chalk.yellow('-v, --version') + '    output version',
      '  ' + chalk.yellow('-h, --help') + '       output help message',
      '  ' +
        chalk.yellow('--baseUrl') +
        '        set github baseUrl ' +
        chalk.cyan('*'),
      '  ' +
        chalk.yellow('--timeout') +
        '        set github request timeout ' +
        chalk.cyan('*'),
      '  ' + chalk.yellow('--no-color') + '       disable colors',
      '',
      chalk.gray(
        'Get a personal access token here: https://github.com/settings/tokens',
      ),
      chalk.gray('[repo] and [public_repo] scopes need to be activated'),
      '',
      chalk.cyan('*') + ' see https://octokit.github.io/rest.js/v18#usage',
    ].join('\n') + '\n',
  );

  return;
}

if (!argv.token) {
  wrt(chalk.red('ERROR: No token provided\n'));
  process.exit(1);
}

if (!argv.config) {
  wrt(chalk.red('ERROR: No config file provided\n'));
  process.exit(1);
}

var logs = {};
function logger(config) {
  if (!logs[config.type]) {
    logs[config.type] = {};
  }
  if (!logs[config.type][config.state]) {
    logs[config.type][config.state] = [];
  }
  logs[config.type][config.state].push(config);
}
logger.verbose = function () {
  if (argv.verbose) {
    wrt([].join.call(arguments, ' ') + '\n');
  }
};

function getConfig() {
  const configPath = path.resolve(process.cwd(), argv.config);

  switch (path.extname(configPath)) {
    case '.json':
      return require(configPath);
    case '.yml':
    case '.yaml':
      return YAML.load(configPath);
    default:
      throw new Error('config needs to be a .json, .yml or .yaml file');
  }
}

Q.fcall(getConfig)
  .then(function (config) {
    return require('./lib/index')(
      {
        token: argv.token,
        log: logger,
      },
      config,
      {
        baseUrl: argv.baseUrl,
        request: {
          timeout: argv.timeout,
        },
      },
    );
  })
  .then(function () {
    _.forEach(logs, function (states, type) {
      wrt(chalk.grey(type + ': '));
      if (argv.verbose) {
        wrt('\n');
      }
      var str = [];
      _.forEach(states, function (messages, state) {
        var color;
        switch (state) {
          case CONSTANTS.LOG_TYPE_OK:
            color = chalk.green;
            break;
          case CONSTANTS.LOG_TYPE_DELETE:
            color = chalk.yellow;
            break;
          case CONSTANTS.LOG_TYPE_CREATE:
            color = chalk.cyan;
            break;
          case CONSTANTS.LOG_TYPE_UPDATE:
            color = chalk.magenta;
            break;
        }
        if (argv.verbose) {
          messages.forEach(function (message) {
            wrt(
              '  ' +
                color(state) +
                ': ' +
                message.user +
                '/' +
                message.repo +
                ' - ' +
                message.title +
                '\n',
            );
          });
        } else {
          str.push(color(messages.length + ' ' + state));
        }
      });
      if (str.length) {
        wrt(str.join(' ') + '\n');
      }
    });

    if (argv.verbose) {
      wrt('\n' + chalk.green('DONE') + '\n');
    }
  })
  .catch(function (err) {
    wrt(chalk.red(err) + '\n');
    if (argv.verbose) {
      wrt(err.stack + '\n');
    }
    process.exit(1);
  });
