// vendor modules
import _ from 'lodash';
// utility modules
import utils from '../utils/';

export default {
  create(context) {
    return {
      ImportDeclaration(node) {
        const options = {
          ...utils.defaultOptions,
          ..._.get(context, 'options[0]', {}),
        };

        const isFirstImportNode = utils.isFirstImportNode(node, context);

        if (isFirstImportNode) {
          const sourceCode = context.getSourceCode();
          const nextImportNodes = utils.getNextImportNodes(node, context);

          const allImportNodes = [node].concat(nextImportNodes);
          const allCommentNodes = sourceCode.getAllComments();
          const importCommentNodes = _.filter(
            allCommentNodes,
            comment => comment.end < _.last(allImportNodes).start,
          );

          const { commentRules, pathAliases } = options.commentRules;

          allImportNodes.forEach((importNode) => {
            const associatedComment = _.findLast(
              importCommentNodes,
              comment => comment.end < importNode.start,
            );

            const moduleMeta = utils.getModuleMeta({
              importNode,
              context,
              commentRules,
              pathAliases,
            });

            const commentRule = _.find(commentRules, { moduleType: moduleMeta.moduleType });

            const isAssociatedCommentInvalid =
              commentRule && _.trim(_.get(associatedComment, 'value')) !== commentRule.comment;

            if (isAssociatedCommentInvalid) {
              context.report({
                node: importNode,
                message: `module import: no associated "// ${commentRule.comment}" comment`,
              });
            }
          });

          const relevantImportCommentNodes = importCommentNodes.filter(comment =>
            _.find(commentRules, { comment: _.trim(comment.value) }));

          const relevantImportCommentNodesRuleIndices = relevantImportCommentNodes
            .map(commentNode => _.findIndex(commentRules, { comment: _.trim(commentNode.value) }))
            .sort((a, b) => a - b);

          relevantImportCommentNodes.forEach((commentNode, commentNodeIndex) => {
            const commentRule = _.find(commentRules, { comment: _.trim(commentNode.value) });
            const commentRuleIndex = _.findIndex(commentRules, {
              comment: _.trim(commentNode.value),
            });
            const commentModuleType = commentRule.moduleType;
            const listedCommentRuleIndex = _.indexOf(
              relevantImportCommentNodesRuleIndices,
              commentRuleIndex,
            );

            const prevCommentRuleIndex = listedCommentRuleIndex
              ? relevantImportCommentNodesRuleIndices[listedCommentRuleIndex - 1]
              : -1;

            if (listedCommentRuleIndex !== commentNodeIndex) {
              if (!listedCommentRuleIndex) {
                context.report({
                  node: commentNode,
                  message: `"${commentModuleType}" modules need to be first in order`,
                });
              } else {
                const precedingModuleType = commentRules[prevCommentRuleIndex].moduleType;

                context.report({
                  node: commentNode,
                  message: `"${commentModuleType}" modules need to be after "${precedingModuleType}" modules`,
                });
              }
            }
          });
        }
      },
    };
  },
};
