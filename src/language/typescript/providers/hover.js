const vscode = require('vscode')
const ts = require('typescript')
const { hoverProvider } = require('../../generic/providers')

module.exports.hoverProvider = async (editor, node, positionOf) => {
  const nodePosition = positionOf(node.start)
  const hoverCommand = await hoverProvider(editor, nodePosition)
  const command = hoverCommand[0]
  if (command && command.contents && command.contents.length > 0) {
    // get typescript type
    const mode = vscode.workspace.getConfiguration('parameterHints').get('hintingType')
    const parsingString = getTypescriptType(hoverCommand)
    if (!parsingString)
      return false

    let preparse = parsingString.trim()
      // .replace(/^var(.*?):\s*(.*?)(\s*new\s*.*?\(|\()(.*)/s, '(method) a$2($4')
      .replace(/^constructor\s*([a-zA-Z0-9]+)\s*\(/s, '(method) a$1(')
      // .replace(/^const(.*?):\s*(.*?)(\s*new\s*.*?\(|\()(.*)/s, '(method) a$2($4')
      // .replace(/^let(.*?):\s*(.*?)(\s*new\s*.*?\(|\()(.*)/s, '(method) a$2($4')
      .replace(/\(method\)(([^(]*?)\.|\s*)([a-z_A-Z0-9]+)(\s*\(|\s*<)/s, '(method) function $3$4')
      .replace(/\(alias\)((.*?)\.|\s*)([a-z_A-Z0-9]+)(\s*\(|\s*<)/s, '(method) function $3$4')
      .replace(/function (([^(]*?)\.|\s*)([a-z_A-Z0-9]+)(\s*\(|\s*<)/s, '(method) function $3$4')
      .replace(/function\s*([a-zA-Z_0-9]+\.)([a-z_A-Z0-9]+)/s, 'function $2')
      .replace(/\(method\)\s*function\s*([a-z_A-Z0-9]+)\s*<(.*?)>\(/s, '(method) function $1(')

    while (/^\(method\) /.test(preparse))
      preparse = preparse.replace(/^\(method\) /, '')

    const replacethreepoint = '__点点点__'
    preparse = preparse.replace(/<(.*?)>(,|\)|\s*\|)/g, '$2')
      .replace(/\w+<...>/g, v => v.replace('...', replacethreepoint))
      .replace(/_[^:]+:\s*\w+[;]/g, '') // 过滤私有属性
      .replace(/\[Symbol\.[^:]+:\s*\w+[;]/g, '') // 过滤[Symbol.iterator]
      .replace(/[\&\|]\s*{[\n\s]*}/g, '') // 过滤空的{}
      .replace(/{[\n\s]*\[Symbol\.replace\][^;]+;\n}/, 'String | RegExp')
    const parsed = ts.createSourceFile('inline.ts', preparse, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const statement = parsed.statements[0]
    if (statement.kind === ts.SyntaxKind.VariableStatement) {
      // VariableStatement
      const match = preparse.match(/:([\s\n\w\{\}\?;\:\<\>\[\]\|,\(\)=]*)/)
      if (!match)
        return false
      return [
        {
          label: `:${match[1].replace(/\s*\n\s*/g, '').trim().replace(/;}/g, '}')}`,
          start: node.end,
          end: node.end,
        },
      ]
    }
    const subparams = statement.parameters
    if (!subparams)
      return false

    const params = []
    let variadicLabel = ''
    let variadicCounter = 0

    for (let i = 0; i < node.arguments.length; i++) {
      let label
      if (variadicLabel) {
        if (mode === 'typeOnly')
          label = variadicLabel
        else
          label = `${variadicLabel}[${variadicCounter}]`

        variadicCounter++
      }
      else if (subparams.length <= i) {
        break
      }
      if (!label) {
        let variadic = false
        if (subparams[i].dotDotDotToken)
          variadic = true

        label = subparams[i]
        if (mode === 'typeOnly') {
          const type = label.type
          if (type && type.getFullText().includes('|')) {
            label = type.types.map((e) => {
              if (e.elementType && e.elementType.typeName)
                return e.elementType.typeName.escapedText
              if (e.typeName)
                return e.typeName.escapedText
              if (e.kind === ts.SyntaxKind.FunctionType)
                return 'Function'
              if (e.kind === ts.SyntaxKind.TypeLiteral)
                return ''
              if (e.kind === ts.SyntaxKind.StringKeyword)
                return 'String'
              if (e.kind === ts.SyntaxKind.NumberKeyword)
                return 'Number'
              if (e.kind === ts.SyntaxKind.BooleanKeyword)
                return 'Boolean'
              if (e.kind === ts.SyntaxKind.ObjectKeyword)
                return 'Object'
              return ''
            }).filter(Boolean).join(' | ')
          }
          else {
            let e = label.type
            if (e) {
              if (e.elementType && e.elementType.typeName)
                e = e.elementType.typeName.escapedText
              if (e.typeName)
                e = e.typeName.escapedText
              if (e.kind === ts.SyntaxKind.FunctionType)
                e = 'Function'
              if (e.kind === ts.SyntaxKind.TypeLiteral)
                e = ''
              if (e.kind === ts.SyntaxKind.StringKeyword)
                e = 'String'
              if (e.kind === ts.SyntaxKind.NumberKeyword)
                e = 'Number'
              if (e.kind === ts.SyntaxKind.BooleanKeyword)
                e = 'Boolean'
              if (e.kind === ts.SyntaxKind.ObjectKeyword)
                e = 'Object'
            }
            if (typeof e !== 'string')
              e = ''

            label = e
          }

          if (label && variadic)
            variadicLabel = label
        }
        else if (mode === 'variableAndType') {
          if (!label.type)
            continue
          let type = label.type.getFullText()

          if (type.includes('|')) {
            const types = label.type?.types
            if (types) {
              type = types.map((e) => {
                if (e.elementType && e.elementType.typeName)
                  return e.elementType.typeName.escapedText
                if (e.typeName)
                  return e.typeName.escapedText
                if (e.kind === ts.SyntaxKind.FunctionType)
                  return 'Function'
                if (e.kind === ts.SyntaxKind.TypeLiteral)
                  return ''
                if (e.kind === ts.SyntaxKind.StringKeyword)
                  return 'String'
                if (e.kind === ts.SyntaxKind.NumberKeyword)
                  return 'Number'
                if (e.kind === ts.SyntaxKind.BooleanKeyword)
                  return 'Boolean'
                if (e.kind === ts.SyntaxKind.ObjectKeyword)
                  return 'Object'
                return ''
              }).filter(Boolean).join(' | ')
            }
          }
          else {
            let e = label.type
            if (e) {
              if (e.elementType && e.elementType.typeName)
                e = e.elementType.typeName.escapedText
              else if (e.typeName)
                e = e.typeName.escapedText
              else if (e.kind === ts.SyntaxKind.FunctionType)
                e = 'Function'
              else if (e.kind === ts.SyntaxKind.TypeLiteral)
                e = ''
              else if (e.kind === ts.SyntaxKind.StringKeyword)
                e = 'String'
              else if (e.kind === ts.SyntaxKind.NumberKeyword)
                e = 'Number'
              else if (e.kind === ts.SyntaxKind.BooleanKeyword)
                e = 'Boolean'
              else if (e.kind === ts.SyntaxKind.ObjectKeyword)
                e = 'Object'
            }
            if (typeof e !== 'string')
              e = ''

            type = e || type.replace(/\s*\n\s*/g, '').trim()
          }
          label = `${type} ${label.name.escapedText}`
        }
        else if (mode === 'variableOnly') {
          label = label.name.escapedText
        }
        if (variadic) {
          const match = label.match(/([\w,\(\)\|\s\<\>\[\]]+)(\[\])(.*)/)
          if (match)
            variadicLabel = match[1].replace(/^\s*?\((.*)\)$/, '$1') + match[3]
          else
            variadicLabel = label
          label = `${variadicLabel}[${variadicCounter}]`
          variadicCounter++
        }
      }
      if (label) {
        params.push({
          label: `${label.trim().replaceAll(replacethreepoint, '...').replace(/;}/g, '}')}:`,
          start: node.arguments[i].getStart(),
          end: node.arguments[i].getEnd(),
        })
      }
    }
    return params
  }

  return false
}
const typescriptReg = /```typescript(.*?)```/s

function getTypescriptType(hoverCommand) {
  for (let i = 0; i < hoverCommand.length; i++) {
    const items = hoverCommand[i].contents
    for (let j = 0; j < items.length; j++) {
      const match = items[j].value.match(typescriptReg)
      if (match)
        return match[1]
    }
  }
}
