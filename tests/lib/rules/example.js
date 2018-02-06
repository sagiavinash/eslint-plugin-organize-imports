var path = require('path');
var rule = require('../../../lib/rules/example');
var test = require('../files/index.js');
var RuleTester = require('eslint').RuleTester;
RuleTester.setDefaultConfig({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  }
});

var ruleTester = new RuleTester();

ruleTester.run('example', rule, {
  valid: ([
    {
      code: `
        // test modules
        import x from "./existent-file";
        import y from "./existent-file-2";
      `,
      filename: path.join(process.cwd(), './tests/lib/files/')
    },
    {
      code: `
        // vendor modules
        import x from "path";
      `,
      filename: path.join(process.cwd(), './tests/lib/files/')
    }
  ]).map(function (testCase) {
    return Object.assign(testCase, {
      options: [{
        moduleType: 'nodeModule',
        comment: ' vendor modules'
      }, {
        moduleType: 'testModule',
        paths: ['tests/lib/files/'],
        comment: ' test modules'
      }]
    });
  }),
  invalid: ([
    {
      code: `
        import x from "./existent-file";
        import y from "path";
      `,
      filename: path.join(process.cwd(), './tests/lib/files/'),
      errors: [{
        message: 'module import: no associated "\\\\ test modules" comment'
      }, {
        message: 'module import: no associated "\\\\ vendor modules" comment',
      }]
    },
    // {
    //   code: `
    //     // test modules
    //     import x from "./existent-file";
    //     // vendor modules
    //     import y from "path";
    //   `,
    //   filename: path.join(process.cwd(), './tests/lib/files/'),
    //   errors: [
    //     {
    //       message: 'module needs to come after "nodeModule" modules'
    //     },
    //     {
    //       message: 'module import: no associated "\\\\ test modules" comment'
    //     }
    //   ]
    // }
  ]).map(function (testCase) {
    return Object.assign(testCase, {
      options: [{
        moduleType: 'nodeModule',
        comment: ' vendor modules'
      }, {
        moduleType: 'testModule',
        paths: ['tests/lib/files/'],
        comment: ' test modules'
      }]
    });
  }),
});
