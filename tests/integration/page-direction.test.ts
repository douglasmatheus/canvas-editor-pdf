import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import { PaperDirection } from '../../src/dataset/enum/Editor'
import type { IElement } from '../../src/interface/Element'

// Real page geometry from the produced PDF — the only thing that proves a page
// actually came out landscape.
async function pageSizes(
  instance: DrawPdf
): Promise<{ width: number; height: number }[]> {
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const sizes: { width: number; height: number }[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const { width, height } = (await doc.getPage(p)).getViewport({ scale: 1 })
    sizes.push({ width: Math.round(width), height: Math.round(height) })
  }
  return sizes
}

const isLandscape = (s: { width: number; height: number }) => s.width > s.height

// A page break carrying paperDirection opens a new section in that direction.
const sectionedDoc = (direction?: PaperDirection): IElement[] => [
  { value: ZERO },
  { value: 'portrait section' },
  {
    type: ElementType.PAGE_BREAK,
    value: '\n',
    ...(direction ? { paperDirection: direction } : {})
  },
  { value: 'second section' },
  { value: ZERO }
]

describe('mixed page orientations by section', () => {
  it('keeps every page portrait when no page break sets a direction', async () => {
    const sizes = await pageSizes(
      new DrawPdf({}, { main: sectionedDoc() })
    )
    expect(sizes.length).toBe(2)
    expect(sizes.map(isLandscape)).toEqual([false, false])
  })

  it('turns the section after the page break landscape', async () => {
    const sizes = await pageSizes(
      new DrawPdf({}, { main: sectionedDoc(PaperDirection.HORIZONTAL) })
    )
    expect(sizes.length).toBe(2)
    // Page 1 keeps the global direction, page 2 follows the page break.
    expect(sizes.map(isLandscape)).toEqual([false, true])
    // Landscape must be the portrait size with the axes swapped.
    expect(sizes[1].width).toBe(sizes[0].height)
    expect(sizes[1].height).toBe(sizes[0].width)
  })

  it('returns to the global direction on a page break with no direction', async () => {
    const main: IElement[] = [
      { value: ZERO },
      { value: 'portrait' },
      {
        type: ElementType.PAGE_BREAK,
        value: '\n',
        paperDirection: PaperDirection.HORIZONTAL
      },
      { value: 'landscape' },
      { type: ElementType.PAGE_BREAK, value: '\n' },
      { value: 'portrait again' },
      { value: ZERO }
    ]
    const sizes = await pageSizes(new DrawPdf({}, { main }))
    expect(sizes.length).toBe(3)
    expect(sizes.map(isLandscape)).toEqual([false, true, false])
  })

  it('round-trips paperDirection through getValue()', () => {
    const instance = new DrawPdf(
      {},
      { main: sectionedDoc(PaperDirection.HORIZONTAL) }
    )
    instance.render()
    const pageBreak = instance
      .getValue()
      .main.find(el => el.type === ElementType.PAGE_BREAK)
    expect(pageBreak?.paperDirection).toBe(PaperDirection.HORIZONTAL)
  })

  it('reports the per-page direction list', () => {
    const instance = new DrawPdf(
      {},
      { main: sectionedDoc(PaperDirection.HORIZONTAL) }
    )
    instance.render()
    expect(instance.getPageDirectionList()).toEqual([
      PaperDirection.VERTICAL,
      PaperDirection.HORIZONTAL
    ])
    expect(instance.getPageDirection(1)).toBe(PaperDirection.HORIZONTAL)
  })
})
