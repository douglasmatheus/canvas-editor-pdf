import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'

// Where the first line number starts, in editor pixels divided back by scale,
// so the result is directly comparable across scales.
async function unscaledLineNumberX(scale: number): Promise<number> {
  const instance = new DrawPdf(
    { scale, lineNumber: { disabled: false } },
    { main: [{ value: ZERO }, { value: 'text' }] }
  )
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  // The page number is a '1' too; the line number is the one left of the body.
  const xs = content.items
    .filter(item => 'str' in item && item.str === '1')
    .map(item => ('transform' in item ? item.transform[4] : Infinity))
  return Math.min(...xs) / pdfPerPx / scale
}

describe('line numbers', () => {
  // The number is measured in the scaled line-number font (TextMeasurer), so
  // the width already includes scale and only `right` is multiplied by it
  // (canvas-editor 0111a98f). Measuring unscaled with that formula, or scaled
  // with `(width + right) * scale`, makes the numbers drift as scale grows.
  it('sit at the same place relative to the page at any scale', async () => {
    const atOne = await unscaledLineNumberX(1)
    expect(await unscaledLineNumberX(2)).toBeCloseTo(atOne, 1)
    expect(await unscaledLineNumberX(3)).toBeCloseTo(atOne, 1)
  })
})
