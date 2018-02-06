var path = require('path');
var _ = require('lodash');

module.exports = {
  isImportNode: function(node) {
    return node.type === 'ImportDeclaration';
  },
  getPreviousNode: function(node, context) {
    var sourceCode = context.getSourceCode();
    var previousToken = context.getTokenBefore(node);

    return previousToken ? (
      sourceCode.getNodeByRangeIndex(previousToken.range[0])
    ) : null;
  },

  getPreviousImportNodes: function(node, context) {
    var currentNode = node;
    var previousImportNodes = [];

    while (currentNode) {
      var previousNode = this.getPreviousNode(currentNode, context);

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

  isFirstImportNode: function(node, context) {
    const previousImportNodes = this.getPreviousImportNodes(node, context);

    return _.isEmpty(previousImportNodes);
  },

  getNextNode: function(node, context) {
    var sourceCode = context.getSourceCode();
    var nextToken = context.getTokenAfter(node);

    return nextToken ? (
      sourceCode.getNodeByRangeIndex(nextToken.range[0])
    ) : null;
  },
  getNextImportNode: function(node, context) {
    var currentNode = node;
    var nextImportNodes = [];

    while (currentNode) {
      var nextNode = this.getNextNode(currentNode, context);

      if (nextNode) {
        if (this.isImportNode(nextNode)) {
          return nextNode;
        }

        currentNode = nextNode;
      } else {
        return null;
      }
    }
  },
  getNextImportNodes: function(node, context) {
    var currentNode = node;
    var nextImportNodes = [];

    while (currentNode) {
      var nextImportNode = this.getNextImportNode(currentNode, context);

      if (nextImportNode) {
        nextImportNodes.push(nextImportNode);

        currentNode = nextImportNode;
      } else {
        break;
      }
    }

    return nextImportNodes;
  },
  getModuleMeta: function(node, context, commentRules) {
    var sourceFilePath = context.getFilename();
    var importPath = node.source.value;
    var isLocalFile = path.parse(importPath).dir;

    var resolvedPath = (function() {
      if (isLocalFile) {
        var absolutePath = path.join(sourceFilePath, importPath);

        return {
          isLocalFile: true,
          path: absolutePath
        };
      }

      return {
        isLocalFile: false,
        path: importPath,
      };
    })();

    const absolutePath = resolvedPath.path;
    const relativePath = path.relative(process.cwd(), resolvedPath.path);
    const moduleType = resolvedPath.isLocalFile ? _.find(commentRules, (rule) => (
      _.find(rule.paths, (rulePath) => _.startsWith(relativePath, rulePath))
    )).moduleType : 'nodeModule';

    return {
      moduleType,
      path: importPath,
      absolutePath,
      relativePath
    };
  }
}