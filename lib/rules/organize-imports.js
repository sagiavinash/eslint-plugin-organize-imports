// vendor modules
import _ from 'lodash';
// utility modules
import utils from '../utils/';

/*
TODO:
function fixOutOfOrder(context, firstNode, secondNode, order)
https://github.com/benmosher/eslint-plugin-import/blob/master/src/rules/order.js#L175
*/
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

          const lastImportNodeEnd = _.last(allImportNodes).end;

          const topNodes = _.filter(
            sourceCode.ast.body,
            ({ start }) => (start < lastImportNodeEnd),
          );

          const allCommentNodes = sourceCode.getAllComments();
          const topCommentNodes = _.filter(
            allCommentNodes,
            ({ start }) => start < lastImportNodeEnd,
          );

          const topEntities = _.orderBy([...topNodes, ...topCommentNodes], ['start']);

          const { commentRules, pathAliases } = options;
          const topEntitiesRuleIndices = _.map(
            topEntities,
            (entity) => {
              if (entity.type === 'ImportDeclaration') {
                const { moduleType } = utils.getModuleMeta({
                  importNode: entity,
                  context,
                  commentRules,
                  pathAliases,
                });

                return _.findIndex(commentRules, { moduleType });
              }

              const comment = _.trim(entity.value);

              return _.findIndex(commentRules, { comment });
            },
          );

          /* eslint-disable */
          // console.log('topEntities', topEntities);
          // console.log('topCommentNodeRuleIndices', JSON.stringify(topCommentNodeRuleIndices, null, 2));
          /* eslint-enable */

          _.forEach(topEntities, (entity, index) => {
            const isCurrentEntitySimilarToPreviousEntity = (
              topEntitiesRuleIndices[index] === topEntitiesRuleIndices[index - 1]
            );

            if (isCurrentEntitySimilarToPreviousEntity) return;

            const prevEntities = topEntities.slice(0, index);
            const nextEntities = topEntities.slice(index + 1);

            const checkIfBothAreImports = (e1, e2) => (
              e1.type === 'ImportDeclaration' &&
              e2.type === 'ImportDeclaration'
            );
            const checkIfBothAreComments = (e1, e2) => (
              e1.type !== 'ImportDeclaration' &&
              e2.type !== 'ImportDeclaration'
            );

            const currentEntityRuleIndex = topEntitiesRuleIndices[index];

            const prevEntityViolations = _.reduce(
              prevEntities,
              (result, prevEntity, prevIndex) => {
                if (
                  checkIfBothAreImports(entity, prevEntity) ||
                  checkIfBothAreComments(entity, prevEntity)
                ) {
                  const prevEntityRuleIndex = topEntitiesRuleIndices[prevIndex];

                  return (currentEntityRuleIndex < prevEntityRuleIndex) ? (
                    [...result, { index: prevIndex, ruleIndex: prevEntityRuleIndex }]
                  ) : result;
                }

                return result;
              },
              [],
            ).sort((v1, v2) => (v2.ruleIndex - v1.ruleIndex));

            const nextEntityViolations = _.reduce(
              nextEntities,
              (result, nextEntity, nextIndex) => {
                if (
                  checkIfBothAreImports(entity, nextEntity) ||
                  checkIfBothAreComments(entity, nextEntity)
                ) {
                  const nextEntityRuleIndex = topEntitiesRuleIndices[index + nextIndex + 1];

                  return (currentEntityRuleIndex > nextEntityRuleIndex) ? (
                    [...result, { index: nextIndex, ruleIndex: nextEntityRuleIndex }]
                  ) : result;
                }

                return result;
              },
              [],
            ).sort((v1, v2) => (v1.ruleIndex - v2.ruleIndex));

            const hasViolations = (
              !_.isEmpty(prevEntityViolations) ||
              !_.isEmpty(nextEntityViolations)
            );

            if (hasViolations) {
              const currentEntityModuleType = commentRules[currentEntityRuleIndex].moduleType;
              const prevEntityViolationModuleType = prevEntityViolations[0] ? (
                commentRules[prevEntityViolations[0].ruleIndex].moduleType
              ) : null;
              const nextEntityViolationModuleType = nextEntityViolations[0] ? (
                commentRules[nextEntityViolations[0].ruleIndex].moduleType
              ) : null;

              /* eslint-disable */
              // console.log('index', index);
              // console.log('currentEntityModuleType', currentEntityModuleType);
              // console.log('prevEntityViolationModuleType', prevEntityViolationModuleType);
              // console.log('nextEntityViolationModuleType', nextEntityViolationModuleType);
              /* eslint-enable */

              const messageStart = `"${currentEntityModuleType}" modules should be `;
              const prevViolationMessage = prevEntityViolationModuleType ? (
                `before "${prevEntityViolationModuleType}" modules`
              ) : null;
              const messageConjunction = (
                (prevEntityViolationModuleType && nextEntityViolationModuleType) ? ' and ' : null
              );
              const nextViolationMessage = nextEntityViolationModuleType ? (
                `after "${nextEntityViolationModuleType}" modules`
              ) : null;

              const errorMessageArr = _.compact([
                messageStart,
                prevViolationMessage,
                messageConjunction,
                nextViolationMessage,
              ]);

              const errorMessage = _.compact(errorMessageArr).join('');

              context.report({
                node: entity,
                message: errorMessage,
              });
            }

            const isEntityFirstImportOfModuleType = (
              entity.type === 'ImportDeclaration' &&
              _.indexOf(topEntitiesRuleIndices, currentEntityRuleIndex) >= index
            );

            if (!isEntityFirstImportOfModuleType) return;

            /* eslint-disable */
            // console.log('index', index);
            /* eslint-enable */

            const isPreviousEntityComment = _.get(topEntities[index - 1], 'type') !== 'ImportDeclaration';
            const previousEntityRuleIndex = topEntitiesRuleIndices[index - 1];
            const isPreviousEntitySameModuleType = (
              currentEntityRuleIndex === previousEntityRuleIndex
            );

            if (!isPreviousEntityComment || !isPreviousEntitySameModuleType) {
              const commentText = commentRules[currentEntityRuleIndex].comment;

              context.report({
                node: entity,
                message: `no associated "// ${commentText}" comment`,
                fix(fixer) {
                  return fixer.insertTextBefore(entity, `// ${commentText}\n`);
                },
              });
            }
          });
        }
      },
    };
  },
};
