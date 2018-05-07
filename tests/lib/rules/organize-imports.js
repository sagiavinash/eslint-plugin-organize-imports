import path from 'path';
import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/organize-imports';

RuleTester.setDefaultConfig({ parser: 'babel-eslint' });

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
});

const injectConfig = (testCases, testConfig) => ({
  ...testCases,
  valid: testCases.valid.map((testCase) => ({ ...testCase, ...testConfig })),
  invalid: testCases.invalid.map((testCase) => ({ ...testCase, ...testConfig })),
});

const testEslintConfig = {
  options: [
    {
      orderRules: [
        {
          moduleType: 'nodeModule',
          comment: 'vendor modules',
        },
        {
          moduleType: 'testModule',
          include: ['tests/lib/files/'],
          comment: 'test modules',
        },
      ],
      pathAliases: [{
        prefix: '<tests>',
        resolvesTo: './tests/lib/files',
      }],
    },
  ],
};

const mockSourceFileLocation = path.join(process.cwd(), './tests/lib/files/test.js');

ruleTester.run(
  'organize-imports',
  rule,
  injectConfig(
    {
      valid: [
        {
          code: `
            // test modules
            import x from "<tests>/existent-file";
            import y from "./existent-file-2";
          `,
          filename: mockSourceFileLocation,
        },
        {
          code: `
            // vendor modules
            import y from "path";
            // test modules
            // hello
            import x from "./existent-file";
          `,
          filename: mockSourceFileLocation,
        },
      ],
      invalid: [
        {
          code: `
            import y from "path";
            import x from "./existent-file";
          `,
          filename: mockSourceFileLocation,
          errors: [
            {
              message: 'no associated "// vendor modules" comment',
            },
            {
              message: 'no associated "// test modules" comment',
            },
          ],
        },
        {
          code: `
            // test modules
            import x from "./existent-file";
            // vendor modules
            import y from "path";
          `,
          filename: mockSourceFileLocation,
          errors: [
            {
              message: '"testModule" modules should be after "nodeModule" modules',
            },
            {
              message: '"nodeModule" modules should be before "testModule" modules',
            },
          ],
        },
      ],
    },
    testEslintConfig,
  ),
);
