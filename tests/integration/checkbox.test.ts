import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { CheckboxMarkType } from '../../src/dataset/enum/Common'
import { ControlType } from '../../src/dataset/enum/Control'
import { ElementType } from '../../src/dataset/enum/Element'
import { ListStyle, ListType } from '../../src/dataset/enum/List'
import type { ICheckbox, ICheckboxOption } from '../../src/interface/Checkbox'
import type { IEditorOption } from '../../src/interface/Editor'
import type { IElement } from '../../src/interface/Element'

// Pure colours: they survive the PDF round-trip unrounded.
const COLORS: ICheckboxOption = {
  fillStyle: '#00ff00',
  strokeStyle: '#0000ff',
  checkFillStyle: '#ff0000',
  checkStrokeStyle: '#ff00ff',
  checkMarkColor: '#00ffff'
}

interface IPaintedPath {
  paint: 'fill' | 'stroke'
  color: string
  // Flat path data — op 0 is moveTo, op 1 is lineTo.
  coords: number[]
}

// Every filled or stroked path on page 1, tagged with the colour it was
// painted in (tracking q/Q so a restored state is honoured).
async function paintedPaths(
  main: IElement[],
  options: IEditorOption = {}
): Promise<IPaintedPath[]> {
  const instance = new DrawPdf(
    { ...options, checkbox: { ...COLORS, ...options.checkbox } },
    { main }
  )
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const opList = await (await doc.getPage(1)).getOperatorList()
  const paths: IPaintedPath[] = []
  let state = { fill: '', stroke: '' }
  const stack: (typeof state)[] = []
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    if (fn === OPS.save) {
      stack.push({ ...state })
    } else if (fn === OPS.restore) {
      state = stack.pop() ?? state
    } else if (fn === OPS.setFillRGBColor) {
      state.fill = String(args[0]).toLowerCase()
    } else if (fn === OPS.setStrokeRGBColor) {
      state.stroke = String(args[0]).toLowerCase()
    } else if (fn === OPS.constructPath) {
      const paint = args[0] === OPS.fill ? 'fill' : 'stroke'
      paths.push({
        paint,
        color: paint === 'fill' ? state.fill : state.stroke,
        coords: Array.from(args[1][0] as ArrayLike<number>)
      })
    }
  }
  return paths
}

// [moveTo count, lineTo count] of a flat path.
function segments(coords: number[]): [number, number] {
  let moves = 0
  let lines = 0
  for (let i = 0; i < coords.length; ) {
    const op = coords[i]
    if (op === 0 || op === 1) {
      if (op === 0) moves++
      else lines++
      i += 3
    } else {
      i += 1
    }
  }
  return [moves, lines]
}

const checkboxDoc = (
  checkbox: ICheckbox,
  extra: Partial<IElement> = {}
): IElement[] => [
  { value: ZERO },
  { type: ElementType.CHECKBOX, value: '', checkbox, ...extra },
  { value: 'x' }
]

function markOf(paths: IPaintedPath[]): IPaintedPath {
  const marks = paths.filter(
    p => p.paint === 'stroke' && p.color === COLORS.checkMarkColor
  )
  expect(marks.length).toBe(1)
  return marks[0]
}

describe('checkbox colours', () => {
  it('paints a checked box with the check* options', async () => {
    const paths = await paintedPaths(checkboxDoc({ value: true }))
    const fill = paths.filter(p => p.color === COLORS.checkFillStyle)
    const border = paths.filter(p => p.color === COLORS.checkStrokeStyle)
    expect(fill.map(p => p.paint)).toEqual(['fill'])
    expect(border.map(p => p.paint)).toEqual(['stroke'])
    markOf(paths)
    // The unchecked colours stay out of it.
    expect(
      paths.some(
        p => p.color === COLORS.fillStyle || p.color === COLORS.strokeStyle
      )
    ).toBe(false)
  })

  it('paints an unchecked box with fillStyle / strokeStyle and no mark', async () => {
    const paths = await paintedPaths(checkboxDoc({ value: false }))
    const fill = paths.filter(p => p.color === COLORS.fillStyle)
    const border = paths.filter(p => p.color === COLORS.strokeStyle)
    expect(fill.map(p => p.paint)).toEqual(['fill'])
    expect(border.map(p => p.paint)).toEqual(['stroke'])
    expect(paths.some(p => p.color === COLORS.checkMarkColor)).toBe(false)
  })
})

describe('checkbox mark type', () => {
  it('draws a tick by default', async () => {
    const mark = markOf(await paintedPaths(checkboxDoc({ value: true })))
    expect(segments(mark.coords)).toEqual([1, 2])
  })

  it('draws a cross when the element asks for one', async () => {
    const mark = markOf(
      await paintedPaths(
        checkboxDoc({ value: true, markType: CheckboxMarkType.CROSS })
      )
    )
    expect(segments(mark.coords)).toEqual([2, 2])
  })

  it('falls back to the control, then the global option', async () => {
    const fromControl = markOf(
      await paintedPaths(
        checkboxDoc(
          { value: true },
          {
            control: {
              type: ControlType.CHECKBOX,
              value: null,
              code: null,
              markType: CheckboxMarkType.CROSS
            }
          }
        )
      )
    )
    expect(segments(fromControl.coords)).toEqual([2, 2])
    const fromOption = markOf(
      await paintedPaths(checkboxDoc({ value: true }), {
        checkbox: { markType: CheckboxMarkType.CROSS }
      })
    )
    expect(segments(fromOption.coords)).toEqual([2, 2])
  })

  it('lets the element override the global option', async () => {
    const mark = markOf(
      await paintedPaths(
        checkboxDoc({ value: true, markType: CheckboxMarkType.CHECK }),
        { checkbox: { markType: CheckboxMarkType.CROSS } }
      )
    )
    expect(segments(mark.coords)).toEqual([1, 2])
  })

  it('carries the mark type onto a checkbox list item', async () => {
    const attrs = {
      listId: 'todo',
      listType: ListType.UL,
      listStyle: ListStyle.CHECKBOX,
      checkbox: { value: true, markType: CheckboxMarkType.CROSS }
    }
    const mark = markOf(
      await paintedPaths([
        { value: ZERO, ...attrs },
        { value: 'a', ...attrs },
        { value: ZERO }
      ])
    )
    expect(segments(mark.coords)).toEqual([2, 2])
  })
})
