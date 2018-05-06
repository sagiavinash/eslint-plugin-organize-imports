import path from 'path';
import _ from 'lodash';
import minimatch from 'minimatch';

export default {
  defaultOptions: {
    commentRules: [
      {
        moduleType: 'nodeModule',
        comment: 'vendor modules',
      },
      {
        moduleType: 'userModule',
        comment: 'user modules',
        include: ['**'],
      },
    ],
  },
  isImportNode(node) {
    return node.type === 'ImportDeclaration';
  },
  getPreviousNode(node, context) {
    const sourceCode = context.getSourceCode();
    const previousToken = context.getTokenBefore(node);

    return previousToken ? sourceCode.getNodeByRangeIndex(previousToken.range[0]) : null;
  },

  getPreviousImportNodes(node, context) {
    let currentNode = node;
    const previousImportNodes = [];

    while (currentNode) {
      const previousNode = this.getPreviousNode(currentNode, context);

      if (previousNode) {
        if (this.isImportNode(previousNode)) {
          previousImportNodes.push(previousNode);
        }

        currentNode = previousNode;
      } else {
        break;
      }
    }

    return previousImportNodes;
  },

  isFirstImportNode(node, context) {
    const previousImportNodes = this.getPreviousImportNodes(node, context);

    return _.isEmpty(previousImportNodes);
  },

  getNextNode(node, context) {
    const sourceCode = context.getSourceCode();
    const nextToken = context.getTokenAfter(node);

    return nextToken ? sourceCode.getNodeByRangeIndex(nextToken.range[0]) : null;
  },
  getNextImportNode(node, context) {
    let currentNode = node;

    while (currentNode) {
      const nextNode = this.getNextNode(currentNode, context);

      if (nextNode) {
        if (this.isImportNode(nextNode)) {
          return nextNode;
        }

        currentNode = nextNode;
      } else {
        return null;
      }
    }

    return null;
  },
  getNextImportNodes(node, context) {
    let currentNode = node;
    const nextImportNodes = [];

    while (currentNode) {
      const nextImportNode = this.getNextImportNode(currentNode, context);

      if (nextImportNode) {
        nextImportNodes.push(nextImportNode);

        currentNode = nextImportNode;
      } else {
        break;
      }
    }

    return nextImportNodes;
  },
  getModuleMeta({
    importNode, context, commentRules, pathAliases,
  }) {
    const sourceFilePath = context.getFilename();
    const pathAliasConfig = _.find(pathAliases, config =>
      _.startsWith(importNode.source.value, config.prefix));

    console.log('\nimportPath', importNode.source.value);
    const importPath = pathAliasConfig
      ? importNode.source.value.replace(new RegExp(`^${pathAliasConfig.prefix}`, 'g'), () => {
        const result = (
          path.relative(
            path.join(sourceFilePath, '..'),
            path.join(process.cwd(), pathAliasConfig.resolvesTo)
          ) ||
          '.'
        );
        console.log('sourceFilePath', sourceFilePath);
        console.log('process.cwd()', process.cwd());
        console.log('pathAliasConfig.resolvesTo', pathAliasConfig.resolvesTo);
        console.log('pathAliasConfig.prefix', pathAliasConfig.prefix);
        console.log('replacedPathAbs', path.join(process.cwd(), pathAliasConfig.resolvesTo));
        console.log('replacedPath', result);

        return result;
      })
      : importNode.source.value;

    const isLocalFile = _.startsWith(importPath, '.');

    const resolvedPath = {
      isLocalFile,
      path: isLocalFile ? path.join(sourceFilePath, '..', importPath) : importPath,
    };

    const absolutePath = resolvedPath.path;
    const relativePath = path.relative(process.cwd(), resolvedPath.path);
    const moduleType = (() => {
      if (!resolvedPath.isLocalFile) return 'nodeModule';

      const commentRule = _.find(commentRules, (rule) => {
        const didMatchIncludePaths = _.find(
          rule.include,
          rulePath =>
            _.startsWith(relativePath, rulePath) ||
            minimatch(relativePath, rulePath) ||
            minimatch(relativePath, `${rulePath}/**`),
        );
        const didMatchExcludePaths = _.find(
          rule.exclude,
          rulePath =>
            _.startsWith(relativePath, rulePath) ||
            minimatch(relativePath, rulePath) ||
            minimatch(relativePath, `${rulePath}/**`),
        );

        return didMatchIncludePaths && !didMatchExcludePaths;
      });

      return _.get(commentRule, 'moduleType');
    })();

    return {
      isLocalFile: resolvedPath.isLocalFile,
      path: importPath,
      moduleType,
      absolutePath,
      relativePath,
      pathAliasConfig,
    };
  },
};
