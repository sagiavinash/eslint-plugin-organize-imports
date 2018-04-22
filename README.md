# eslint-plugin-import-comments:
An eslint plugin to enforce grouping of similar modules together with an associated comment & order of these groups.
## Problem:
when lot of imports are present on top of a file, its difficult to recognize if a file is imported already and leads to duplicate imports.
To prevent this, one can use this lint rule to organize imports

## Usage:
```
npm install --save-dev eslint-plugin-module-comments
```

## Config/Options Schema:
- `commentRules` - **_(required)_** Array of configs for each import-group comments
    - `moduleType` - **_(required)_** String to denote a module-group in error messages. `nodeModule` is a predefined value to denote external dependencies
    - comment - **_(required)_** string that is the comment body. rule checks for equality after comment body's trimming whitespace.
- `pathAliases` - **_(optional)_** to support usecases like `babel-plugin-module-alias` and any other other webpack plugins which preprocess shorthand prefixes in import paths to an actual path
    - `prefix` - string to denote the shorthand prefix that gets preprocessed to get the final filepath (*ex: `expose` in `babel-plugin-module-alias`*)
    - `resolvesTo` - the string that replaces the path prefix by the preprocessing tool (*ex: `src` in `babel-plugin-module-alias`*)
## Example:
`.eslintrc`
```json
{
  rules: {
    "import-comments/import-comments": ["error", {
      "commentRules": [{
        "moduleType": "nodeModule",
        "comment": " vendor modules"
      }, {
        "moduleType": "testModule",
        "comment": " test modules",
        "include": ["src/test/"],
        "exclude":  ["src/test/utils"]
      }, {
        "moduleType": "utilityModule",
        "comment": " utility modules",
        "include": [
          "src/shared/constants",
          "src/+(shared|server|test)/utils", // globs/unix file patterns
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

### Valid code samples
##### valid sample - 1
**sourceFileLocation:** `/src/test/sample1.js`
```js
// vendor modules
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
// utility modules
import sampleUtils from '<shared>/utils/sample-utils';
```
### Invalid code samples
##### invalid sample - 1 (missing comments)
**sourceFileLocation:** `/src/test/sample1.js`
```js
// vendor modules
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import sampleUtils from '<shared>/utils/sample-utils';  //
```
