#!/usr/bin/env node

'use strict';

console.log('WIP');
require('./lib/index')({
  token: '...',
  log: console
}, [{
  'repositories': [
    'Xiphe/test'
  ],
  'milestones': [
    {
      'previousTitles': [
        '[BG-Area] Internal Release',
        'hallo'
      ],
      'title': 'liufgyiofjopi',
      'state': 'open',
      'description': 'Hallo Welt',
      'due_on': '2015-09-04T23:59:59Z'
    }, {
      'title': 'Banana',
      'state': 'absent'
    }
  ],
  'labels': [
    {
      'previousNames': [
        'krass'
      ],
      'name': 'Hallo',
      'color': 'ff0000'
    }
  ]
}]).then(function() {
  console.log('ok');
}, function(err) {
  console.log('error', err);
});
