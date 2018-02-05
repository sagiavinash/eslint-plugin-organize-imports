var rule = require('../../../lib/rules/example')
var RuleTester = require('eslint').RuleTester;

var ruleTester = new RuleTester();

ruleTester.run('example', rule, {
  valid: [
    'var validExample;',
    'for(;;) {}',
    'do {} while(condition)'
  ],

  invalid: [
    {
      code: 'while(condition) {}',
      errors: [ { message: 'Do not use while loops.' } ]
    }
  ]
});
