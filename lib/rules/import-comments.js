
'use strict';

// vendor modules
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
// utility modules
var utils = require('../utils/');

module.exports = {
  create: function(context) {
    return ({
      ImportDeclaration: function(node) {
        if (_.isEmpty(context.options)) return;

        var currentNode = node;
        var isFirstImportNode = utils.isFirstImportNode(node, context);

        if (isFirstImportNode) {
          var sourceCode = context.getSourceCode();
          var nextImportNodes = utils.getNextImportNodes(node, context);

          var allImportNodes = [node].concat(nextImportNodes);
          var allCommentNodes = sourceCode.getAllComments();
          var importCommentNodes = _.filter(allCommentNodes, function(comment) {
            return (
              comment.end < _.last(allImportNodes).start
            );
          });
          var {commentRules, pathAliases} = context.options[1];

          allImportNodes.forEach(function(importNode, index) {
            var associatedComment = _.findLast(importCommentNodes, function(comment) {
              return (
                comment.end < importNode.start
              );
            });

            var moduleMeta = utils.getModuleMeta({
              importNode,
              context,
              commentRules,
              pathAliases
            });

            var commentRule = _.find(commentRules, { moduleType: moduleMeta.moduleType });

            var isAssociatedCommentInvalid = commentRule && (
              _.get(associatedComment, 'value') !== commentRule.comment
            );

            if (isAssociatedCommentInvalid) {
              var basePath = path.relative(process.cwd(), context.getFilename());

              // console.log('\n\n');
              // console.log('sourceFilePath', context.getFilename());
              // console.log('importPath', importNode.source.value);
              // console.log('comment, importNode', _.get(associatedComment, 'end'), importNode.start);
              // console.log('moduleMeta', JSON.stringify(moduleMeta, null, 2));
              // console.log('commentRule', JSON.stringify(commentRule, null, 2));
              // console.log('associatedComment', JSON.stringify(_.get(associatedComment, 'value'), null, 2));

              context.report({
                node: importNode,
                message: (
                  'module import: no associated "//' + commentRule.comment + '" comment'
                )
              });
            }
          });

          var relevantImportCommentNodes = importCommentNodes.filter(function(comment) {
            return _.find(commentRules, {comment: comment.value});
          });

          var prevCommentRuleIndex = -1;
          var relevantImportCommentNodesRuleIndices = (
            relevantImportCommentNodes.map(function(commentNode) {
              return _.findIndex(commentRules, { comment: commentNode.value });
            }).sort(function(a, b) { return a - b; })
          );
          relevantImportCommentNodes.forEach(function(commentNode, commentNodeIndex) {
            var commentRule = _.find(commentRules, { comment: commentNode.value });
            var commentRuleIndex = _.findIndex(commentRules, { comment: commentNode.value });
            var commentModuleType = commentRule.moduleType;
            var listedCommentRuleIndex = relevantImportCommentNodesRuleIndices.indexOf(commentRuleIndex);
            var prevCommentRuleIndex = listedCommentRuleIndex ? (
              relevantImportCommentNodesRuleIndices[listedCommentRuleIndex - 1]
            ) : -1;

            if (listedCommentRuleIndex !== commentNodeIndex) {
              if (!listedCommentRuleIndex) {
                context.report({
                  node: commentNode,
                  message: '"' + commentModuleType + '" modules need to be first in order'
                });
              } else {
                var precedingModuleType = commentRules[prevCommentRuleIndex].moduleType;

                context.report({
                  node: commentNode,
                  message: (
                    '"' + commentModuleType + '" modules need to be after "' + precedingModuleType + '" modules'
                  )
                });
              }
            }

            prevCommentRuleIndex === commentRuleIndex;
          });
        }
      }
    });
  }
};
