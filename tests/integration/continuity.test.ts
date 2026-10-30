import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { PageMode } from '../../src/dataset/enum/Editor'
import type { IElement } from '../../src/interface/Element'

const lines = (count: number): IElement[] =>
  Array.from({ length: count }, (_, i) => [
    { value: ZERO },
    { value: `line${i + 1}` }
  ]).flat()

async function renderContinuity(main: IElement[]) {
  const instance = new DrawPdf({ pageMode: PageMode.CONTINUITY }, { main })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  const texts = content.items
    .filter(item => 'str' in item)
    .map(item => ('str' in item ? item.str.replace(/\s/g, '') : ''))
  return {
    pageCount: doc.numPages,
    // page height in editor pixels
    height: page.view[3] / pdfPerPx,
    paperHeight: instance.getHeight(),
    texts
  }
}

// pageMode: 'continuity' lays the whole document out on one page with no
// page breaks, like the editor's continuous mode.
describe('continuity page mode', () => {
  it('keeps a short document on one paper-sized page', async () => {
    const result = await renderContinuity(lines(3))
    expect(result.pageCount).toBe(1)
    expect(result.height).toBeCloseTo(result.paperHeight, 0)
    expect(result.texts).toContain('line3')
  })

  it('grows the single page to fit a long document', async () => {
    const result = await renderContinuity(lines(120))
    expect(result.pageCount).toBe(1)
    expect(result.height).toBeGreaterThan(result.paperHeight * 2)
    expect(result.texts).toContain('line1')
    expect(result.texts).toContain('line120')
  })
})
