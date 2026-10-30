import { describe, it, expect } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import { ZERO } from '../../src/dataset/constant/Common'
import { ElementType } from '../../src/dataset/enum/Element'
import { ListType } from '../../src/dataset/enum/List'
import type { IElement } from '../../src/interface/Element'

async function renderPage(main: IElement[]) {
  const instance = new DrawPdf({}, { main })
  instance.render()
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const page = await doc.getPage(1)
  const pdfPerPx = page.view[2] / instance.getWidth()
  const content = await page.getTextContent()
  // Where a text run starts and ends, in editor pixels from the top-left of
  // the page. The 0.1 char spacing TextParticle sets makes pdf.js split runs
  // ('m a rk', or 'ite' + 'm'), so match on a prefix with spaces removed.
  const at = (str: string) => {
    const item = content.items.find(
      item => 'str' in item && item.str.replace(/\s/g, '').startsWith(str)
    )
    if (!item || !('transform' in item)) throw new Error(`no '${str}' on page`)
    return {
      x: item.transform[4] / pdfPerPx,
      right: (item.transform[4] + item.width) / pdfPerPx,
      y: (page.view[3] - item.transform[5]) / pdfPerPx
    }
  }
  return { at }
}

describe('text metrics', () => {
  // canvas-editor d89c0ade (#1342): a text row's ascent/descent come from the
  // font's basis metrics, not from the glyphs it happens to hold.
  it('gives a row the same height whatever glyphs it holds', async () => {
    const markY = async (text: string) =>
      (
        await renderPage([
          { value: ZERO },
          { value: text },
          { value: ZERO },
          { value: 'mark' }
        ])
      ).at('mark').y
    const plain = await markY('aaaa')
    expect(await markY('jjj')).toBeCloseTo(plain, 1)
    expect(await markY('(((')).toBeCloseTo(plain, 1)
    expect(await markY('ÉÉÉ')).toBeCloseTo(plain, 1)
  })

  // The basis metrics are measured in the element's own font. They used to
  // come out in the default size whatever the element's, so an empty
  // paragraph in a large font was no taller than one in the default size.
  it('sizes an empty paragraph by its own font', async () => {
    const gapAfterEmptyLine = async (size: number) => {
      const { at } = await renderPage([
        { value: ZERO },
        { value: 'top' },
        { value: ZERO, size },
        { value: ZERO },
        { value: 'after' }
      ])
      return at('after').y - at('top').y
    }
    const extra = (await gapAfterEmptyLine(48)) - (await gapAfterEmptyLine(16))
    expect(extra).toBeGreaterThan(20)
  })

  // The list number's width is measured in the list font (it used to be
  // measured in the measuring canvas's own 10px default), so the item text
  // starts LIST_GAP (10px) after the number, not on top of the gap.
  it('starts list text a full gap after its number', async () => {
    const { at } = await renderPage([
      { value: ZERO },
      {
        type: ElementType.LIST,
        value: '',
        listType: ListType.OL,
        valueList: [{ value: 'item' }]
      }
    ])
    expect(at('ite').x - at('1.').right).toBeGreaterThan(8)
  })
})
