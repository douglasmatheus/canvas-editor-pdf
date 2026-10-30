import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'

// pdf.js flat path data: 0 = moveTo (x, y), 1 = lineTo (x, y), 4 = closePath
const MOVE_TO = 0
const LINE_TO = 1
const CLOSE_PATH = 4

function pathOps(data: number[]): number[] {
  const ops: number[] = []
  for (let i = 0; i < data.length; ) {
    const op = data[i]
    ops.push(op)
    i += op === MOVE_TO || op === LINE_TO ? 3 : op === CLOSE_PATH ? 1 : 7
  }
  return ops
}

// jsPDF's own rect() never closes the path — it retraces the top edge — so
// rect() is replayed as moveTo + three lineTo + closePath (as upstream's
// feature/pdf replayer does).
describe('rect paths', () => {
  it('draws the page border as one closed path', async () => {
    const instance = new DrawPdf(
      { pageBorder: { disabled: false }, pageNumber: { disabled: true } },
      { main: [{ value: ZERO }] }
    )
    instance.render()
    const bytes = new Uint8Array(
      instance.getPdf().output('arraybuffer') as ArrayBuffer
    )
    const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
    const opList = await (await doc.getPage(1)).getOperatorList()
    const paths = opList.fnArray
      .map((fn, i) =>
        fn === OPS.constructPath
          ? pathOps(Array.from(opList.argsArray[i][1][0] as ArrayLike<number>))
          : null
      )
      .filter((ops): ops is number[] => !!ops)
    // the border is the only path with a closePath
    const closed = paths.filter(ops => ops.includes(CLOSE_PATH))
    expect(closed).toEqual([[MOVE_TO, LINE_TO, LINE_TO, LINE_TO, CLOSE_PATH]])
  })
})
