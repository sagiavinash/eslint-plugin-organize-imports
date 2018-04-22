var path = require('path');
var _ = require('lodash');
var minimatch = require('minimatch');

module.exports = {
  defaultOptions: {
    commentRules: [{
      moduleType: 'nodeModule',
      comment: 'vendor modules'
    }, {
      moduleType: 'userModule',
      comment: 'user modules',
      include: ['**']
    }]
  },
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
    var previousImportNodes = this.getPreviousImportNodes(node, context);

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
  getModuleMeta: function({importNode, context, commentRules, pathAliases}) {
    var sourceFilePath = context.getFilename();
    var pathAliasConfig = _.find(pathAliases, function(config) {
      return _.startsWith(importNode.source.value, config.prefix);
    });
    var importPath = pathAliasConfig ? (
      importNode.source.value.replace(
        new RegExp(`^${pathAliasConfig.prefix}`, 'g'),
        function() {
          return path.relative(sourceFilePath, path.join(process.cwd(), pathAliasConfig.resolvesTo));
        }
      )
    ) : importNode.source.value;

    var isLocalFile = _.startsWith(importPath, '.');

    var resolvedPath = {
      isLocalFile,
      path: (
        isLocalFile ?
          path.join(sourceFilePath, '..', importPath) :
          importPath
      )
    };

    var absolutePath = resolvedPath.path;
    var relativePath = path.relative(process.cwd(), resolvedPath.path);
    var moduleType = (function() {
      if (resolvedPath.isLocalFile) {
        var commentRule = _.find(commentRules, function(rule) {
          var didMatchIncludePaths = (
            _.find(rule.include, function(rulePath) {
              return (
                _.startsWith(relativePath, rulePath) ||
                minimatch(relativePath, rulePath) ||
                minimatch(relativePath, `${rulePath}/**`)
              );
            })
          );
          var didMatchExcludePaths = (
            _.find(rule.exclude, function(rulePath) {
              return (
                _.startsWith(relativePath, rulePath) ||
                minimatch(relativePath, rulePath) ||
                minimatch(relativePath, `${rulePath}/**`)
              );
            })
          );

          return didMatchIncludePaths && !didMatchExcludePaths;
        });

        return _.get(commentRule, 'moduleType');
      }

      return 'nodeModule';
    })();

    return {
      isLocalFile: resolvedPath.isLocalFile,
      moduleType,
      path: importPath,
      absolutePath,
      relativePath,
      pathAliasConfig
    };
  }
}
