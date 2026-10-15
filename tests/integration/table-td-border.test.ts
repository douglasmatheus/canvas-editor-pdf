import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import { TdBorder } from '../../src/dataset/enum/table/Table'
import type { IElement } from '../../src/interface/Element'
import type { ITd } from '../../src/interface/table/Td'

const TABLE_COLOR = '#ff0000'
const CELL_COLOR = '#00ff00'

// A one-row, two-cell table; the second cell carries the overrides under test.
const tableDoc = (secondTd: Partial<ITd>): IElement[] => [
  { value: ZERO },
  {
    type: ElementType.TABLE,
    value: '',
    borderColor: TABLE_COLOR,
    colgroup: [{ width: 100 }, { width: 100 }],
    trList: [
      {
        height: 40,
        tdList: [
          { colspan: 1, rowspan: 1, value: [{ value: ZERO }] },
          { colspan: 1, rowspan: 1, value: [{ value: ZERO }], ...secondTd }
        ]
      }
    ]
  },
  { value: ZERO }
]

interface IStrokedPath {
  color: string
  lineWidth: number
  // Flat path data — op 0 is moveTo, op 1 is lineTo.
  coords: number[]
}

// Every path pdf.js sees on page 1, tagged with the stroke colour and line
// width in effect (tracking q/Q so a restored state is honoured).
async function strokedPaths(data: IElement[]): Promise<IStrokedPath[]> {
  const instance = new DrawPdf({}, { main: data })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const opList = await (await doc.getPage(1)).getOperatorList()
  const paths: IStrokedPath[] = []
  let state = { color: '', lineWidth: 1 }
  const stack: (typeof state)[] = []
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    const args = opList.argsArray[i]
    if (fn === OPS.save) {
      stack.push({ ...state })
    } else if (fn === OPS.restore) {
      state = stack.pop() ?? state
    } else if (fn === OPS.setStrokeRGBColor) {
      state.color = String(args[0]).toLowerCase()
    } else if (fn === OPS.setLineWidth) {
      state.lineWidth = Number(args[0])
    } else if (fn === OPS.constructPath) {
      paths.push({
        ...state,
        coords: Array.from(args[1][0] as ArrayLike<number>)
      })
    }
  }
  return paths
}

describe('table cell border color / width', () => {
  it('strokes an overridden cell in its own colour and width', async () => {
    const paths = await strokedPaths(
      tableDoc({ borderColor: CELL_COLOR, borderWidth: 3 })
    )
    const table = paths.filter(p => p.color === TABLE_COLOR)
    const cell = paths.filter(p => p.color === CELL_COLOR)
    expect(table.length).toBeGreaterThan(0)
    expect(cell.length).toBe(1)
    expect(cell[0].lineWidth).toBeCloseTo(table[0].lineWidth * 3, 3)
    // Drawn after every default border, so a shared edge shows the override.
    expect(paths.indexOf(cell[0])).toBeGreaterThan(
      paths.lastIndexOf(table[table.length - 1])
    )
  })

  it("falls back to the table's border width when only the colour is set", async () => {
    const paths = await strokedPaths(tableDoc({ borderColor: CELL_COLOR }))
    const table = paths.filter(p => p.color === TABLE_COLOR)
    const cell = paths.filter(p => p.color === CELL_COLOR)
    expect(cell.length).toBe(1)
    expect(cell[0].lineWidth).toBeCloseTo(table[0].lineWidth, 3)
  })

  it('limits the override to the cell borderTypes when set', async () => {
    const paths = await strokedPaths(
      tableDoc({ borderColor: CELL_COLOR, borderTypes: [TdBorder.TOP] })
    )
    const cell = paths.filter(p => p.color === CELL_COLOR)
    expect(cell.length).toBe(1)
    // A single horizontal moveTo + lineTo — not the full rectangle.
    const [m, x1, y1, l, x2, y2] = cell[0].coords
    expect(cell[0].coords.length).toBe(6)
    expect([m, l]).toEqual([0, 1])
    expect(y1).toBe(y2)
    expect(x1).not.toBe(x2)
  })

  it('leaves cells without overrides on the table border', async () => {
    const paths = await strokedPaths(tableDoc({}))
    expect(paths.some(p => p.color === CELL_COLOR)).toBe(false)
  })
})
