
'use strict';

// vendor modules
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
// utility modules
import utils from '../utils/';

export default {
  create: (context) => ({
    ImportDeclaration(node) {
      if (_.isEmpty(context.options)) return;

      const currentNode = node;
      const isFirstImportNode = utils.isFirstImportNode(node, context);

      if (isFirstImportNode) {
        const sourceCode = context.getSourceCode();
        const nextImportNodes = utils.getNextImportNodes(node, context);

        const allImportNodes = [node].concat(nextImportNodes);
        const allCommentNodes = sourceCode.getAllComments();
        const importCommentNodes = _.filter(allCommentNodes, (comment) => (
          comment.end < _.last(allImportNodes).start
        ));
        const commentRules = context.options;

        allImportNodes.forEach(function(importNode) {
          const associatedComment = _.findLast(importCommentNodes, (comment) => (
            comment.end < importNode.start
          ));

          const moduleMeta = utils.getModuleMeta(importNode, context, commentRules);
          const commentRule = _.find(commentRules, { moduleType: moduleMeta.moduleType });

          const isAssociatedCommentValid = commentRule && (
            _.get(associatedComment, 'value') !== commentRule.comment
          );

          if (isAssociatedCommentValid) {
            context.report({
              node: importNode,
              message: (
                'module import: no associated "\\\\' + commentRule.comment + '" comment'
              )
            });
          }
        });

        // const currentRuleIndex = -1;
        // importCommentNodes.forEach(function(commentNode) {
        //   const commentRule = _.find(commentRules, { comment: commentNode.value });

        //   if (commentRule) {
        //     const nextImportNode = utils.getNextImportNode(commentNode, context);
        //     const moduleType = utils.getModuleMeta(nextImportNode, context, commentRules).moduleType;
        //     const moduleCommentRuleIndex = _.findIndex(commentRules, { moduleType });

        //     console.log('moduleCommentRuleIndex', moduleCommentRuleIndex);
        //     if (moduleCommentRuleIndex === -1) return;

        //     if (currentRuleIndex === -1) {
        //       currentRuleIndex = moduleCommentRuleIndex;
        //     }

        //     if (moduleCommentRuleIndex > currentRuleIndex) {
        //       console.log('after');
        //       context.report({
        //         node: nextImportNode,
        //         message: 'module needs to come after "' + commentRules[currentRuleIndex].moduleType + '" modules'
        //       });
        //     } else if (moduleCommentRuleIndex < currentRuleIndex) {
        //       console.log('before');
        //       context.report({
        //         node: nextImportNode,
        //         message: 'module needs to come before "' + commentRules[currentRuleIndex].moduleType + '" modules'
        //       });
        //     } else {
        //       console.log('increment');
        //       currentRuleIndex++;
        //     }
        //   }
        // });
      }
    }
  })
};
