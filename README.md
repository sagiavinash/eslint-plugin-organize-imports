# eslint-plugin-organize-imports:
An eslint plugin to enforce grouping of similar modules together with an associated comment & order of these groups.
## Problem:
when lot of imports are present on top of a file, its difficult to recognize if a file is imported already and leads to duplicate imports.
To prevent this, one can use this lint rule to organize imports

## Usage:
```
npm install --save-dev eslint-plugin-organize-imports
```

## Plugin in action - vscode
![Plugin in action - vscode](https://raw.githubusercontent.com/sagiavinash/eslint-plugin-organize-imports/master/assets/plugin_in_use_vscode.png)

## Config/Options Schema:
- `orderRules` - **_(required)_** Array of configs for each import-groups
    - `moduleType` - **_(required)_** String to denote a module-group in error messages. `nodeModule` is a predefined value to denote external dependencies
whitespace.
    - `include` - **_(required)_** array of paths(glob patterns supported) that categorize matching modules into the import group
    - `exclude` - **_(optional)_** array of paths(glob patterns supported) that avoid categorizing the matching modules into the import group
    - `comment` - **_(optional)_** string that is the comment body. rule checks for equality after comment body's trimming 
- `pathAliases` - **_(optional)_** to support use cases like `babel-plugin-module-alias` and any other other webpack plugins which preprocess shorthand prefixes in import paths to an actual path
    - `prefix` - string to denote the shorthand prefix that gets preprocessed to get the final file path (*ex: `expose` in `babel-plugin-module-alias`*)
    - `resolvesTo` - the string that replaces the path prefix by the preprocessing tool (*ex: `src` in `babel-plugin-module-alias`*)
## Example:
`.eslintrc`
```js
{
  "rules": {
    "organize-imports/organize-imports": ["error", {
      "orderRules": [{
        "moduleType": "nodeModule",
        "comment": "vendor modules"
      }, {
        "moduleType": "testModule",
        "comment": "test modules",
        "include": ["src/test/"],
        "exclude":  ["src/test/utils"]
      }, {
        "moduleType": "utilityModule",
        "comment": "utility modules",
        "include": [
          "src/shared/constants",
          "src/+(shared|server|test)/utils",
          "src/server/mock-data"
        ]
      }],
      "pathAliases": [{
        "prefix": "<shared>",
        "resolvesTo": "./src/shared"
      }]
    }]
  }
}
```

## Valid code samples
### valid code
**sourceFileLocation:** `/src/test/sample1.js`
```js
// vendor modules
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
// utility modules
import sampleUtils from '<shared>/utils/sample-utils';
```
## Invalid code samples
### invalid code - (missing comments)
**sourceFileLocation:** `/src/test/sample1.js`
```js
// vendor modules
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import sampleUtils from '<shared>/utils/sample-utils';  /* [eslint] no associated "// utility modules" comment */
```
### invalid code - (wrong order of import-groups)
**sourceFileLocation:** `/src/test/sample1.js`
```js
// utility modules                                      /* [eslint] "utilityModule" modules need to be after "nodeModule" modules */
import sampleUtils from '<shared>/utils/sample-utils';
// vendor modules
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
```
