import importCommentsRule from './rules/import-comments';
import organizeImportsRule from './rules/organize-imports';

export default {
  rules: {
    'import-comments': importCommentsRule,
    'organize-imports': organizeImportsRule,
  },
};
