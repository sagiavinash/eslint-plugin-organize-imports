var path = require('path');
var rule = require('../../../lib/rules/example');
var test = require('/Users/avinashvarma/Downloads/Downloads/oss/eslint-plugin-import-comments/tests/lib/files/index.js');
var RuleTester = require('eslint').RuleTester;
RuleTester.setDefaultConfig({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module"
  }
});

var ruleTester = new RuleTester();

ruleTester.run('example', rule, {
  valid: [
    {
      code: `
        // test comment
        import x from "./existent-file";
        import y from "./existent-file-2";
      `,
      filename: path.join(process.cwd(), './tests/lib/files/')
    },
    {
      code: 'import x from "path";',
      filename: path.join(process.cwd(), './tests/lib/files/')
    }
  ],
  invalid: [{
    code: `
      import x from "./non-existent-file";
    `,
    filename: path.join(process.cwd(), './tests/lib/files/'),
    errors: [{
      message: 'Couldnt find the module'
    }]
  },
  {
    code: 'import x from "no-pkg";',
    filename: path.join(process.cwd(), './tests/lib/files/'),
    errors: [{
      message: 'Couldnt find the module',
    }]
  }]
});
