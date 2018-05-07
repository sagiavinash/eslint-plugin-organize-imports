import path from 'path';
import _ from 'lodash';
import minimatch from 'minimatch';

export default {
  defaultOptions: {
    orderRules: [
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
    importNode, context, orderRules, pathAliases,
  }) {
    const sourceFilePath = context.getFilename();
    const pathAliasConfig = _.find(pathAliases, (config) =>
      _.startsWith(importNode.source.value, config.prefix));

    const importPath = pathAliasConfig
      ? importNode.source.value.replace(new RegExp(`^${pathAliasConfig.prefix}`, 'g'), () => (
        path.relative(
          path.join(sourceFilePath, '..'),
          path.join(process.cwd(), pathAliasConfig.resolvesTo),
        ) || '.'
      ))
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

      const orderRule = _.find(orderRules, (rule) => {
        const didMatchIncludePaths = _.find(
          rule.include,
          (rulePath) =>
            _.startsWith(relativePath, rulePath) ||
            minimatch(relativePath, rulePath) ||
            minimatch(relativePath, `${rulePath}/**`),
        );
        const didMatchExcludePaths = _.find(
          rule.exclude,
          (rulePath) =>
            _.startsWith(relativePath, rulePath) ||
            minimatch(relativePath, rulePath) ||
            minimatch(relativePath, `${rulePath}/**`),
        );

        return didMatchIncludePaths && !didMatchExcludePaths;
      });

      return _.get(orderRule, 'moduleType');
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
  findRootNode(node) {
    let parent = node;
    while (parent.parent != null && parent.parent.body == null) {
      /* eslint-disable prefer-destructuring */
      parent = parent.parent;
      /* eslint-enable prefer-destructuring */
    }
    return parent;
  },
  commentOnSameLineAs(node) {
    return (token) => (
      (token.type === 'Block' || token.type === 'Line') &&
      token.loc.start.line === token.loc.end.line &&
      token.loc.end.line === node.loc.end.line
    );
  },
  getTokensOrCommentsBefore(sourceCode, node, count) {
    let currentNodeOrToken = node;
    const result = [];

    for (let i = 0; i < count; i += 1) {
      currentNodeOrToken = sourceCode.getTokenOrCommentBefore(currentNodeOrToken);
      if (currentNodeOrToken == null) {
        break;
      }
      result.push(currentNodeOrToken);
    }
    return result.reverse();
  },
  getTokensOrCommentsAfter(sourceCode, node, count) {
    let currentNodeOrToken = node;
    const result = [];
    for (let i = 0; i < count; i += 1) {
      currentNodeOrToken = sourceCode.getTokenOrCommentAfter(currentNodeOrToken);
      if (currentNodeOrToken == null) {
        break;
      }
      result.push(currentNodeOrToken);
    }
    return result;
  },
  takeTokensBeforeWhile(sourceCode, node, condition) {
    const tokens = this.getTokensOrCommentsBefore(sourceCode, node, 100);
    const result = [];

    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      if (condition(tokens[i])) {
        result.push(tokens[i]);
      } else {
        break;
      }
    }
    return result.reverse();
  },
  takeTokensAfterWhile(sourceCode, node, condition) {
    const tokens = this.getTokensOrCommentsAfter(sourceCode, node, 100);
    const result = [];
    for (let i = 0; i < tokens.length; i += 1) {
      if (condition(tokens[i])) {
        result.push(tokens[i]);
      } else {
        break;
      }
    }
    return result;
  },
  findOutOfOrder(imported) {
    if (imported.length === 0) return [];

    let maxSeenRankNode = imported[0];
    return imported.filter((importedModule) => {
      const res = importedModule.rank < maxSeenRankNode.rank;

      if (maxSeenRankNode.rank < importedModule.rank) {
        maxSeenRankNode = importedModule;
      }

      return res;
    });
  },
  findStartOfLineWithComments(sourceCode, node) {
    const tokensToEndOfLine = this.takeTokensBeforeWhile(
      sourceCode,
      node,
      this.commentOnSameLineAs(node),
    );
    const startOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].start : node.start;

    let result = startOfTokens;
    for (let i = startOfTokens - 1; i > 0; i -= 1) {
      if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t') {
        break;
      }
      result = i;
    }
    return result;
  },
  findEndOfLineWithComments(sourceCode, node) {
    const tokensToEndOfLine = this.takeTokensAfterWhile(
      sourceCode,
      node,
      this.commentOnSameLineAs(node),
    );
    const endOfTokens = (
      tokensToEndOfLine.length > 0 ?
        tokensToEndOfLine[tokensToEndOfLine.length - 1].end :
        node.end
    );
    let result = endOfTokens;
    for (let i = endOfTokens; i < sourceCode.text.length; i += 1) {
      if (sourceCode.text[i] === '\n') {
        result = i + 1;
        break;
      }
      if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t' && sourceCode.text[i] !== '\r') {
        break;
      }
      result = i + 1;
    }
    return result;
  },
  fixOutOfOrder(context, firstNode, secondNode) {
    const sourceCode = context.getSourceCode();

    const firstRoot = this.findRootNode(firstNode);
    const firstRootStart = this.findStartOfLineWithComments(sourceCode, firstRoot);

    const secondRoot = this.findRootNode(secondNode);
    const secondRootStart = this.findStartOfLineWithComments(sourceCode, secondRoot);
    const secondRootEnd = this.findEndOfLineWithComments(sourceCode, secondRoot);

    let newCode = sourceCode.text.substring(secondRootStart, secondRootEnd);
    if (newCode[newCode.length - 1] !== '\n') {
      newCode += '\n';
    }

    return (fixer) => (
      fixer.replaceTextRange(
        [firstRootStart, secondRootEnd],
        newCode + sourceCode.text.substring(firstRootStart, secondRootStart),
      )
    );
  },
};
