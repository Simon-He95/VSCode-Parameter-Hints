import type { Range } from 'vscode'
import { ThemeColor, workspace } from 'vscode'

const currentState = workspace.getConfiguration('parameterHints')

export class Hints {
  static margin() {
    const margins = (currentState.get('margin') as string).split(' ')
    let top = 0
    if (margins[0].substr(0, 1) === '-') {
      top = +margins[0]
      margins[0] = '0'
    }
    if (margins.length === 1)
      margins.push(margins[0])

    if (margins.length === 2)
      margins.push(margins[0])

    let bottom = 0
    if (margins[2].substr(0, 1) === '-') {
      bottom = +margins[2]
      margins[2] = '0'
    }
    if (margins.length === 3)
      margins.push(margins[1])

    return `${margins.join('px ')}px; top: ${top}px; bottom: ${bottom}px;`
  }

  static padding() {
    const paddings = (currentState.get('padding') as string).split(' ')
    if (paddings.length === 1)
      paddings.push(paddings[0])

    if (paddings.length === 2)
      paddings.push(paddings[0])

    if (paddings.length === 3)
      paddings.push(paddings[1])

    return `${paddings.join('px ')}px`
  }

  static paramHint(message: string, range: Range) {
    // style
    return {
      range,
      renderOptions: {
        before: {
          opacity: 0.2,
          color: new ThemeColor('parameterHints.hintForeground'),
          contentText: message,
          backgroundColor: new ThemeColor('parameterHints.hintBackground'),
          margin: `${Hints.margin()}position: relative; padding: ${Hints.padding()}; display: inline-block;`,
          borderRadius: '5px',
          fontStyle: 'italic',
          fontWeight: '400; font-size: 12px; line-height: 1;',
          bracketSpacing: true,
        },
      },
    }
  }
}
