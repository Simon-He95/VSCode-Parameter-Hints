const ts = require('typescript')
const dashAst = require('../../lib/walker.js')

module.exports.parser = (text, parserOptions) => {
  try {
    const ast = ts.createSourceFile('test.ts', text.replace(/\n\n/g, '\n '), ts.ScriptTarget.Latest, true, parserOptions.language)
    const nodes = {}
    dashAst(ast, (currentNode) => {
      try {
        const expression = currentNode.expression
        if (expression && (expression.name || expression.kind === ts.SyntaxKind.Identifier) && (currentNode.kind === ts.SyntaxKind.CallExpression || currentNode.kind === ts.SyntaxKind.NewExpression) && currentNode.arguments && currentNode.arguments.length) {
          if (expression.name) {
            currentNode.start = expression.name.getStart()
            currentNode.end = expression.name.getEnd()
            currentNode.name = expression.name.escapedText
          }
          else {
            currentNode.start = expression.getStart()
            currentNode.end = expression.getEnd()
            currentNode.name = expression.escapedText
          }
          currentNode.final_end = currentNode.arguments[currentNode.arguments.length - 1].getEnd()
          nodes[currentNode.start] = currentNode
        }
      }
      catch (e) {
      }
    })
    return Object.values(nodes)
  }
  catch (e) {
    return []
  }
}
