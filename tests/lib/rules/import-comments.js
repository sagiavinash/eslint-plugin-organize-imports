import path from 'path';
import { RuleTester } from 'eslint';
import rule from '../../../lib/rules/import-comments';

RuleTester.setDefaultConfig({ parser: 'babel-eslint' });

const ruleTester = new RuleTester();

const injectConfig = (testCases, testConfig) => ({
  ...testCases,
  valid: testCases.valid.map(testCase => ({ ...testCase, testConfig })),
  invalid: testCases.invalid.map(testCase => ({ ...testCase, testConfig })),
});

const testEslintConfig = {
  options: [
    {
      commentRules: [
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
    },
  ],
};

const mockSourceFileLocation = path.join(process.cwd(), './tests/lib/files/test.js');

ruleTester.run(
  'import-comments',
  rule,
  injectConfig(
    {
      valid: [
        {
          code: `
        // test modules
        import x from "./existent-file";
        import y from "./existent-file-2";
      `,
          filename: mockSourceFileLocation,
        },
        {
          code: `
        // vendor modules
        import x from "path";
      `,
          filename: mockSourceFileLocation,
        },
      ],
      invalid: [
        {
          code: `
        import x from "./existent-file";
        import y from "path";
      `,
          filename: mockSourceFileLocation,
          errors: [
            {
              message: 'module import: no associated "// test modules" comment',
            },
            {
              message: 'module import: no associated "// vendor modules" comment',
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
              message: '"testModule" modules need to be after "nodeModule" modules',
            },
            {
              message: '"nodeModule" modules need to be first in order',
            },
          ],
        },
      ],
    },
    testEslintConfig,
  ),
);
