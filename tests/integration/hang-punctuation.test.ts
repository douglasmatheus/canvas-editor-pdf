import { beforeAll, describe, it, expect } from 'vitest'
import { resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { DrawPdf } from '../../src/core/draw/DrawPdf'
import type { IEditorOption } from '../../src/interface/Editor'
import type { IElement } from '../../src/interface/Element'

// CJK needs a registered font, or jsPDF garbles it (and measures it with
// another font's metrics).
async function rendered(main: IElement[], extra: IEditorOption = {}) {
  const instance = new DrawPdf(
    { pageNumber: { disabled: true }, ...extra },
    { main },
    { loadDefaultFonts: true, fontSource: { dir: resolve('public/font') } }
  )
  await instance.defaultFontsLoadedPromise
  instance.render()
  return instance
}

// Text of each line of page 1, top to bottom, spaces removed.
async function lines(main: IElement[], extra: IEditorOption = {}) {
  const instance = await rendered(main, extra)
  const bytes = new Uint8Array(
    instance.getPdf().output('arraybuffer') as ArrayBuffer
  )
  const doc = await getDocument({ data: bytes, verbosity: 0 }).promise
  const content = await (await doc.getPage(1)).getTextContent()
  const byY = new Map<number, { x: number; str: string }[]>()
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const y = Math.round(item.transform[5])
    byY.set(y, [...(byY.get(y) || []), { x: item.transform[4], str: item.str }])
  }
  return [...byY.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, items]) =>
      items
        .sort((a, b) => a.x - b.x)
        .map(item => item.str.replace(/\s/g, ''))
        .join('')
    )
}

// As many 中 as fill the first line exactly, then a full stop that does not
// fit after them.
async function overflowingFullStop(): Promise<IElement[]> {
  const probe = await rendered([{ value: '中'.repeat(100) }])
  const perLine = probe
    .getPageRowList()[0][0]
    .elementList.filter(el => el.value === '中').length
  return [{ value: `${'中'.repeat(perLine)}。` }]
}

// canvas-editor 68f1a417 (#692). Every render loads the CJK fonts, which is
// slow when the whole suite runs in parallel, hence the shared document and
// the longer timeouts.
describe('hangPunctuation', () => {
  let main: IElement[]
  beforeAll(async () => {
    main = await overflowingFullStop()
  }, 30_000)

  it('hangs a closing punctuation mark past the end of a full line', async () => {
    const result = await lines(main, { hangPunctuation: true })
    expect(result).toHaveLength(1)
    expect(result[0].endsWith('中。')).toBe(true)
  }, 30_000)

  it('is off by default: the mark takes the last character with it', async () => {
    const result = await lines(main)
    expect(result).toHaveLength(2)
    expect(result[1]).toBe('中。')
  }, 30_000)
})
