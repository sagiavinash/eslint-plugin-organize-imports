// vendor modules
import _ from 'lodash';
// utility modules
import utils from '../utils/organize-imports';

/*
TODO:
function fixOutOfOrder(context, firstNode, secondNode, order)
https://github.com/benmosher/eslint-plugin-import/blob/master/src/rules/order.js#L175
*/
export default {
  create(context) {
    return {
      'Program:exit': (program) => {
        const options = {
          ...utils.defaultOptions,
          ..._.get(context, 'options[0]', {}),
        };

        const { orderRules, pathAliases } = options;

        const allImportNodes = _.filter(program.body, { type: 'ImportDeclaration' });

        if (_.isEmpty(allImportNodes)) return;

        const lastImportNodeEnd = _.last(allImportNodes).end;

        const getEntityRuleIndex = (entity) => {
          if (entity.type === 'ImportDeclaration') {
            const { moduleType } = utils.getModuleMeta({
              importNode: entity,
              context,
              orderRules,
              pathAliases,
            });

            return _.findIndex(orderRules, { moduleType });
          }

          const comment = _.trim(entity.value);

          return _.findIndex(orderRules, { comment });
        };

        const topNodesInRange = _.filter(
          program.body,
          (node) => (node.start < lastImportNodeEnd),
        );

        const topNodes = _.filter(topNodesInRange, (node) => getEntityRuleIndex(node) !== -1);
        const topNodeRuleIndices = _.map(topNodes, getEntityRuleIndex);

        const sourceCode = context.getSourceCode();
        const allCommentNodes = sourceCode.getAllComments();
        const topCommentNodesInRange = _.filter(
          allCommentNodes,
          (node) => (node.start < lastImportNodeEnd),
        );

        const entitiesInTopRange = _.orderBy([...topNodesInRange, ...topCommentNodesInRange], ['start']);
        const topEntities = _.filter(entitiesInTopRange, (entity) => (
          getEntityRuleIndex(entity) !== -1
        ));

        const topEntitiesRuleIndices = _.map(topEntities, getEntityRuleIndex);

        /* eslint-disable */
        // console.log('topEntities', topEntities);
        // console.log('topCommentNodeRuleIndices', JSON.stringify(topCommentNodeRuleIndices, null, 2));
        /* eslint-enable */

        _.forEach(topEntities, (entity, index) => {
          const isCurrentEntitySimilarToPreviousEntity = (
            topEntitiesRuleIndices[index] === topEntitiesRuleIndices[index - 1] &&
            entity.type === 'ImportDeclaration'
          );

          if (isCurrentEntitySimilarToPreviousEntity) return;

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

          const nextEntityViolations = _.reduce(
            nextEntities,
            (result, nextEntity, nextIndex) => {
              if (
                checkIfBothAreImports(entity, nextEntity) ||
                checkIfBothAreComments(entity, nextEntity)
              ) {
                const nextEntityRuleIndex = topEntitiesRuleIndices[index + nextIndex + 1];

                return (currentEntityRuleIndex > nextEntityRuleIndex) ? (
                  _.orderBy([...result, {
                    entity: nextEntity,
                    index: nextIndex,
                    ruleIndex: nextEntityRuleIndex,
                  }], 'ruleIndex')
                ) : result;
              }

              return result;
            },
            [],
          ).sort((v1, v2) => (v1.ruleIndex - v2.ruleIndex));

          if (!_.isEmpty(nextEntityViolations)) {
            const currentEntityModuleType = orderRules[currentEntityRuleIndex].moduleType;
            const nextEntityViolationModuleType = nextEntityViolations[0] ? (
              orderRules[nextEntityViolations[0].ruleIndex].moduleType
            ) : null;

            /* eslint-disable */
            // console.log('index', index);
            // console.log('currentEntityModuleType', currentEntityModuleType);
            // console.log('prevEntityViolationModuleType', prevEntityViolationModuleType);
            // console.log('nextEntityViolationModuleType', nextEntityViolationModuleType);
            /* eslint-enable */

            const errorMessage = `"${currentEntityModuleType}" modules should be after "${nextEntityViolationModuleType}" modules`;

            const errorFixer = (() => {
              const nextEntity = nextEntityViolations[0].entity;
              const nextEntityTopRangeIndex = _.findIndex(entitiesInTopRange, nextEntity);
              const currentEntityTopRangeIndex = _.findIndex(entitiesInTopRange, entity);
              const countNodesBetweenInTopRange = (
                nextEntityTopRangeIndex - currentEntityTopRangeIndex
              );

              const nextEntityTopIndex = _.findIndex(topEntities, nextEntity);
              const currentEntityTopIndex = _.findIndex(topEntities, entity);
              const countNodesBetweenInTop = (nextEntityTopIndex - currentEntityTopIndex);

              const isFixable = (countNodesBetweenInTop === countNodesBetweenInTopRange);

              if (!isFixable) return null;

              return entity.type === 'ImportDeclaration' ? (
                utils.fixOutOfOrder(context, entity, nextEntity)
              ) : (fixer) => {
                const nextBodyNode = entitiesInTopRange[index + 1];
                const hasNewlineGap = nextBodyNode ? (
                  entity.loc.start.line !== nextBodyNode.loc.start.line
                ) : false;
                const endRange = hasNewlineGap ? (entity.end + 1) : entity.end;

                return fixer.replaceTextRange([entity.start, endRange], '');
              };
            })();

            context.report({
              node: entity,
              message: errorMessage,
              ...(errorFixer ? { fix: errorFixer } : {}),
            });

            return;
          }

          const isEntityFirstImportOfModuleType = (
            entity.type === 'ImportDeclaration' &&
            _.indexOf(topNodeRuleIndices, currentEntityRuleIndex) === _.indexOf(topNodes, entity)
          );

          if (isEntityFirstImportOfModuleType) {
            const isPreviousEntityComment = _.get(topEntities[index - 1], 'type') !== 'ImportDeclaration';
            const previousEntityRuleIndex = topEntitiesRuleIndices[index - 1];
            const isPreviousEntitySameModuleType = (
              currentEntityRuleIndex === previousEntityRuleIndex
            );

            if (!isPreviousEntityComment || !isPreviousEntitySameModuleType) {
              const commentText = orderRules[currentEntityRuleIndex].comment;

              context.report({
                node: entity,
                message: `no associated "// ${commentText}" comment`,
                fix(fixer) {
                  return fixer.insertTextBefore(entity, `// ${commentText}\n`);
                },
              });
            }
          }

          const isEntityUnnecessaryCommentOfModuleType = (
            _.includes(['Line', 'Block'], entity.type) &&
            !(
              currentEntityRuleIndex === topEntitiesRuleIndices[index + 1] &&
              _.get(topEntities[index + 1], 'type') === 'ImportDeclaration'
            )
          );

          if (isEntityUnnecessaryCommentOfModuleType) {
            const commentText = orderRules[currentEntityRuleIndex].comment;

            context.report({
              node: entity,
              message: `unnecessary "// ${commentText}" comment`,
              fix(fixer) {
                const nextBodyNode = entitiesInTopRange[index + 1];
                const hasNewlineGap = nextBodyNode ? (
                  entity.loc.start.line !== nextBodyNode.loc.start.line
                ) : false;
                const endRange = hasNewlineGap ? (entity.end + 1) : entity.end;

                return fixer.replaceTextRange([entity.start, endRange], '');
              },
            });
          }
        });
      },
    };
  },
};
