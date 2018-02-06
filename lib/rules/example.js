
'use strict';

var path = require('path');
var fs = require('fs');
var _ = require('lodash');

function getModuleMeta(node, context) {
  var sourceFilePath = context.getFilename();
  var importPath = node.source.value;
  var isLocalFile = path.parse(importPath).dir;

  var resolvedPath = (function() {
    if (isLocalFile) {
      var absolutePath = path.join(sourceFilePath, importPath);

      return absolutePath;
    }

    return importPath;
  })();

  try {
    require(resolvedPath);

    return {
      absolutePath: resolvedPath,
      relativePath: path.relative(process.cwd(), resolvedPath)
    };
  } catch(e) {
    return e;
  }
};

module.exports = {
  create: function(context) {
    return {
      ImportDeclaration(node) {
        const moduleMeta = getModuleMeta(node, context);

        if (!_.isError(moduleMeta)) {
          var sourceCode = context.getSourceCode();
          // console.log('node.loc', node.loc);
          // console.log('nodeIndex', sourceCode.getIndexFromLoc(node.loc.start));
          var locs = _.map(sourceCode.getCommentsBefore(node), (c) => _.get(c, 'loc.start'));
          if (!_.isEmpty(locs)) {
            locs.map((loc) => {
              // console.log(node);
              const nodeIndex = sourceCode.getIndexFromLoc(node.loc.start);
              // console.log('node Index', nodeIndex);
              // console.log('comment Index', sourceCode.getIndexFromLoc(loc));
              console.log(sourceCode.getNodeByRangeIndex(33));
            });
          }
        } else {
          context.report({
            node,
            message: 'Couldnt find the module'
          });
        }
      }
    }
  }
};