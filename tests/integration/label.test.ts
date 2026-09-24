import { describe, it, expect } from 'vitest'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import type { IPadding } from '../../src/interface/Common'
import type { IElement } from '../../src/interface/Element'

const BACKGROUND = '#00ff00'

const labelDoc = (padding: IPadding): IElement[] => [
  { value: ZERO },
  {
    type: ElementType.LABEL,
    value: 'label',
    label: { backgroundColor: BACKGROUND, padding }
  },
  { value: ZERO }
]

// Height of the label's rounded-rect background, read back from the PDF: the
// vertical extent of the first path filled in the label's background colour.
async function backgroundHeight(padding: IPadding): Promise<number> {
  const instance = new DrawPdf({}, { main: labelDoc(padding) })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const opList = await (await doc.getPage(1)).getOperatorList()
  let color = ''
  for (let i = 0; i < opList.fnArray.length; i++) {
    const args = opList.argsArray[i]
    if (opList.fnArray[i] === OPS.setFillRGBColor) {
      color = String(args[0]).toLowerCase()
    } else if (opList.fnArray[i] === OPS.constructPath && color === BACKGROUND) {
      // args[2] is the path's bounding box: [minX, minY, maxX, maxY].
      const [, minY, , maxY] = Array.from(args[2] as ArrayLike<number>)
      return maxY - minY
    }
  }
  throw new Error('label background not found')
}

describe('label background', () => {
  // The background grows by the top + bottom padding. It used to add
  // top + left (padding[0] + padding[3]), which only looked right because the
  // default padding is symmetric.
  it('is sized by the vertical padding, not the left one', async () => {
    const topHeavy = await backgroundHeight([10, 0, 2, 0])
    const bottomHeavy = await backgroundHeight([2, 0, 10, 0])
    const leftHeavy = await backgroundHeight([2, 10, 2, 10])
    expect(topHeavy).toBeCloseTo(bottomHeavy, 3)
    expect(topHeavy).toBeGreaterThan(leftHeavy)
  })
})
