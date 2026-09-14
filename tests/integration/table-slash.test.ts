import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import { TdSlash } from '../../src/dataset/enum/table/Table'
import type { IElement } from '../../src/interface/Element'

const BORDER_COLOR = '#FF0000'

// A one-cell table whose only decoration is the requested slash(es).
const slashDoc = (slashTypes: TdSlash[]): IElement[] => [
  { value: ZERO },
  {
    type: ElementType.TABLE,
    value: '',
    borderColor: BORDER_COLOR,
    colgroup: [{ width: 200 }],
    trList: [
      {
        height: 40,
        tdList: [
          { colspan: 1, rowspan: 1, slashTypes, value: [{ value: ZERO }] }
        ]
      }
    ]
  },
  { value: ZERO }
]

interface IStrokedPath {
  color: string
  // Flat [op, x, y, …] triples — op 0 is moveTo, op 1 is lineTo.
  coords: number[]
}

// Every path pdf.js sees on page 1, tagged with the stroke colour in effect.
async function strokedPaths(data: IElement[]): Promise<IStrokedPath[]> {
  const instance = new DrawPdf({}, { main: data })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const opList = await (await doc.getPage(1)).getOperatorList()
  const paths: IStrokedPath[] = []
  let color = ''
  for (let i = 0; i < opList.fnArray.length; i++) {
    const args = opList.argsArray[i]
    if (opList.fnArray[i] === OPS.setStrokeRGBColor) {
      color = String(args[0]).toLowerCase()
    } else if (opList.fnArray[i] === OPS.constructPath) {
      paths.push({ color, coords: Array.from(args[1][0] as ArrayLike<number>) })
    }
  }
  return paths
}

// A slash is the only diagonal the table draws — borders are axis-aligned.
const isDiagonal = (coords: number[]) => {
  for (let i = 3; i + 2 < coords.length; i += 3) {
    if (coords[i] !== 1) continue
    if (coords[i + 1] !== coords[i - 2] && coords[i + 2] !== coords[i - 1]) {
      return true
    }
  }
  return false
}

describe('table cell slashes', () => {
  it('strokes a forward slash as a path of its own', async () => {
    const diagonals = (await strokedPaths(slashDoc([TdSlash.FORWARD]))).filter(
      path => isDiagonal(path.coords)
    )
    expect(diagonals.length).toBe(1)
    expect(diagonals[0].color).toBe(BORDER_COLOR.toLowerCase())
    // One moveTo + one lineTo. Anything longer means the still-open path left
    // behind by an earlier stroke (the table outline, or the page margin
    // indicators) rode along and got re-stroked in the border colour.
    expect(diagonals[0].coords.length).toBe(6)
  })

  it('strokes both slashes of a cross in a single path', async () => {
    const diagonals = (
      await strokedPaths(slashDoc([TdSlash.FORWARD, TdSlash.BACK]))
    ).filter(path => isDiagonal(path.coords))
    expect(diagonals.length).toBe(1)
    // Two moveTo/lineTo pairs, still nothing else.
    expect(diagonals[0].coords.length).toBe(12)
  })
})
