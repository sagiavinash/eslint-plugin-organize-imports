'use strict';

module.exports = {
  create: function(context) {
  // context gives us some handy APIs like getting ancestors in the tree, the filename, or the original source code
  // You might preprocess some things here.

    return {
      // For each key in this object, we provide a function to evalate the node when its node type is found in the syntax tree
      // There can be multiple keys, each with their own function
      // You can also share a function for multiple keys, if they process the same

      // Lets pick on while statements
      WhileStatement: function(node) {
        // Normally, you have a little bit more logic here to check conditions before reporting
        // You might look at properties on the node, for example

        // context.report will report a linting problem
        context.report(node, 'Do not use while loops.');
      }
    }
  }
};