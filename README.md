github-sync-issues-milestones
-----------------------------

Sync Labels and Milestones across Multiple repositories

Install
-------

`npm install -g github-sync-issues-milestones`


CLI usage
---------

`github-sync-issues-milestones <options>`

### Options

  - `-t, --token`
    [required] github personal access token
  - `-c, --config`
    [required] path to config file
  - `-V, --verbose`
    make output more verbose
  - `-s, --silent`
    oppress output
  - `-v, --version`
    output version
  - `-h, --help`
    output help message
  - `--no-color`
    disable colors


Get a personal access token under [settings/tokens](https://github.com/settings/tokens)
and ensure [repo] and [public_repo] scopes are activated


Configuration File
------------------

The configuration file needs to be valid JSON and describe
an array of configuration objects.

### Example

```json
[{
  "repositories": [
    "Jimdo/github-sync-issues-milestones"
  ],
  "milestones": [{
    "previousTitles": [
      "Complete Everything"
    ],
    "title": "First Release",
    "state": "open",
    "description": "Tasks to be completed before release",
    "due_on": "2015-09-15T23:59:59Z"
  }],
  "labels": [{
    "previousNames": [
      "bug"
    ],
    "name": "type: bug",
    "color": "fc2929"
  }, {
    "name": "type: feature request",
    "state": "absent"
  }]
}]
```

### configuration object shape
  
  - #### `repositories`

    Array of repositories on which the issues and milestones
    should be synchronized

  - #### `milestones`

    _optional_ Array of milestones that should be synchronized

  - #### `labels` 

    _optional_ Array of labels that should be synchronized

### milestone declaration shape

  - #### `title`

    The title of the milestone

  - #### `previousTitles`

    _optional_ Array of titles this milestone had before.
    We will try to __rename__ milestones found here to `title` 
    instead of creating a new one

  - #### `state`

    _optional_ The state of the milestone. Either `open`, `closed` or `absent`.   
    Default: `open`  

  - #### `description`

    _optional_ A description of the milestone

  - #### `due_on`

    _optional_ The milestone due date. This is a timestamp in ISO 8601 format:  
    `YYYY-MM-DDTHH:MM:SSZ`
 

### label declaration shape

  - #### `name`

    The name of the label

  - #### `color`

    A 6 character hex code, without the leading #, identifying the color

  - #### `previousNames`

    _optional_ Array of names this label had before.
    The new label will be added to issues with any of these
    and the previous labels will then be deleted.

  - #### `state`

    _optional_ Can be `present` or `absent`.   
    Default: `present`  


LICENSE
-------

> The MIT License
> 
> Copyright (c) 2015 Jimdo GmbH
> 
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
> 
> The above copyright notice and this permission notice shall be included in
> all copies or substantial portions of the Software.
> 
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
> THE SOFTWARE.
